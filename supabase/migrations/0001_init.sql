-- Spielebox der Foxy-Bande – Tabellen, Zugriffsregeln (RLS) und Foto-Speicher
-- Grundlage: SPEC §3 (Datenmodell) und §9 (Sicherheit).
-- Ausführen: Supabase-Dashboard → SQL Editor → Inhalt einfügen → Run (siehe README).

-- =========================================================================
-- Tabellen
-- =========================================================================

create table public.players (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  photo_path  text,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Name eindeutig unter den nicht archivierten Spielern
create unique index players_active_name_unique
  on public.players (lower(trim(name))) where not archived;

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  player_id  uuid references public.players (id) on delete set null,
  -- Zusatz zur SPEC: E-Mail zur Anzeige in der Verwaltung (S8)
  email      text
);

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  game_type  text not null default 'doppelkopf' check (game_type = 'doppelkopf')
);

create table public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  player_id  uuid not null references public.players (id),
  -- Zusatz zur SPEC: Reihenfolge = Sitzreihenfolge in neuen Partien
  position   int not null default 0,
  primary key (group_id, player_id)
);

create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  game_type    text not null check (game_type in ('flip7', 'wizard', 'doppelkopf')),
  group_id     uuid references public.groups (id),
  status       text not null default 'open' check (status in ('open', 'finished')),
  settings     jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  -- Doppelkopf braucht eine Runde, andere Spiele haben keine
  check ((game_type = 'doppelkopf') = (group_id is not null))
);

create index matches_started_at on public.matches (started_at desc);

create table public.match_players (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches (id) on delete cascade,
  player_id    uuid references public.players (id),
  guest_name   text,
  seat         int not null check (seat >= 1),
  final_score  int,
  is_winner    boolean not null default false,
  -- genau eins von player_id / guest_name
  check ((player_id is null) <> (guest_name is null)),
  unique (match_id, seat)
);

create index match_players_match on public.match_players (match_id);

create table public.rounds (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches (id) on delete cascade,
  round_no    int not null check (round_no >= 1),
  input       jsonb not null,
  points      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (match_id, round_no)
);

-- =========================================================================
-- Hilfsfunktionen
-- =========================================================================

-- Ist das angemeldete Konto Admin? (security definer: liest profiles trotz RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Neues Konto (per Einladung) → Profil mit Rolle „member“
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Runde anlegen oder ändern: Name + genau 4 Mitglieder in einem Schritt
create or replace function public.save_group(p_id uuid, p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := coalesce(p_id, gen_random_uuid());
begin
  if not public.is_admin() then
    raise exception 'Nur Admins dürfen Runden verwalten.';
  end if;
  if coalesce(array_length(p_member_ids, 1), 0) <> 4
     or (select count(distinct m) from unnest(p_member_ids) m) <> 4 then
    raise exception 'Eine Runde hat genau 4 verschiedene Spieler.';
  end if;

  insert into public.groups (id, name) values (v_id, trim(p_name))
  on conflict (id) do update set name = excluded.name;

  delete from public.group_members where group_id = v_id;
  insert into public.group_members (group_id, player_id, position)
  select v_id, m, ord from unnest(p_member_ids) with ordinality as t(m, ord);
  return v_id;
end;
$$;

-- Partie mit Teilnehmern in einem Schritt anlegen.
-- p_participants: [{"player_id": "…"} | {"guest_name": "…"}, …] in Sitzreihenfolge
create or replace function public.create_match(
  p_game_type text, p_group_id uuid, p_settings jsonb, p_participants jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.matches (game_type, group_id, settings)
  values (p_game_type, p_group_id, coalesce(p_settings, '{}'::jsonb))
  returning id into v_id;

  insert into public.match_players (match_id, player_id, guest_name, seat)
  select v_id,
         nullif(p ->> 'player_id', '')::uuid,
         nullif(trim(p ->> 'guest_name'), ''),
         ord
  from jsonb_array_elements(p_participants) with ordinality as t(p, ord);
  return v_id;
end;
$$;

-- Partie abschließen: Endstände, Sieger und Status in einem Schritt
create or replace function public.finish_match(p_match_id uuid, p_final_scores jsonb, p_winner_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    select 1 from public.match_players
    where match_id = p_match_id and not (p_final_scores ? id::text)
  ) then
    raise exception 'Für jeden Teilnehmer wird ein Endstand benötigt.';
  end if;

  update public.match_players
     set final_score = (p_final_scores ->> id::text)::int,
         is_winner   = id = any (p_winner_ids)
   where match_id = p_match_id;

  update public.matches
     set status = 'finished', finished_at = now()
   where id = p_match_id;
end;
$$;

-- updated_at bei Korrekturen einer Runde automatisch setzen
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger rounds_touch
  before update on public.rounds
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- Zugriffsregeln (Row Level Security) nach SPEC §9
-- Ohne Login: kein Zugriff. Lesen: angemeldet. Stammdaten ändern: Admin.
-- =========================================================================

alter table public.players       enable row level security;
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
alter table public.rounds        enable row level security;

-- players, groups, group_members: lesen angemeldet, anlegen/ändern Admin, kein Löschen von Spielern
create policy "players lesen"   on public.players for select to authenticated using (true);
create policy "players anlegen" on public.players for insert to authenticated with check (public.is_admin());
create policy "players ändern"  on public.players for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "groups lesen"   on public.groups for select to authenticated using (true);
create policy "groups anlegen" on public.groups for insert to authenticated with check (public.is_admin());
create policy "groups ändern"  on public.groups for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "group_members lesen"   on public.group_members for select to authenticated using (true);
create policy "group_members anlegen" on public.group_members for insert to authenticated with check (public.is_admin());
create policy "group_members löschen" on public.group_members for delete to authenticated using (public.is_admin());

-- matches, match_players, rounds: lesen/anlegen/ändern angemeldet, löschen Admin
create policy "matches lesen"   on public.matches for select to authenticated using (true);
create policy "matches anlegen" on public.matches for insert to authenticated with check (true);
create policy "matches ändern"  on public.matches for update to authenticated using (true) with check (true);
create policy "matches löschen" on public.matches for delete to authenticated using (public.is_admin());

create policy "match_players lesen"   on public.match_players for select to authenticated using (true);
create policy "match_players anlegen" on public.match_players for insert to authenticated with check (true);
create policy "match_players ändern"  on public.match_players for update to authenticated using (true) with check (true);
create policy "match_players löschen" on public.match_players for delete to authenticated using (public.is_admin());

create policy "rounds lesen"   on public.rounds for select to authenticated using (true);
create policy "rounds anlegen" on public.rounds for insert to authenticated with check (true);
create policy "rounds ändern"  on public.rounds for update to authenticated using (true) with check (true);
create policy "rounds löschen" on public.rounds for delete to authenticated using (public.is_admin());

-- profiles: lesen angemeldet, ändern/löschen Admin (Anlegen nur über den Trigger)
create policy "profiles lesen"   on public.profiles for select to authenticated using (true);
create policy "profiles ändern"  on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles löschen" on public.profiles for delete to authenticated using (public.is_admin());

-- =========================================================================
-- Foto-Speicher: privater Bucket, lesen angemeldet (signierte URLs), schreiben Admin
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', false)
on conflict (id) do nothing;

create policy "Fotos lesen" on storage.objects for select to authenticated
  using (bucket_id = 'player-photos');
create policy "Fotos hochladen" on storage.objects for insert to authenticated
  with check (bucket_id = 'player-photos' and public.is_admin());
create policy "Fotos ändern" on storage.objects for update to authenticated
  using (bucket_id = 'player-photos' and public.is_admin());
create policy "Fotos löschen" on storage.objects for delete to authenticated
  using (bucket_id = 'player-photos' and public.is_admin());
