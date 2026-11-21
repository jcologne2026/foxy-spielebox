import type { SupabaseClient } from "@supabase/supabase-js";
import type { Group, Match, MatchDetail, MatchResult, NewMatch, Player, Round } from "../domain/types";
import type { PhotoStore } from "./photos";
import type { DataSnapshot, GroupInput, MatchFilter, PlayerInput, Repository, RoundInput } from "./repository";
import { checkSnapshot } from "./snapshot";
import { OFFLINE_MESSAGE } from "./supabaseServices";
import {
  fromMatch,
  fromMatchPlayer,
  fromPlayer,
  fromRound,
  toGroup,
  toMatch,
  toMatchDetail,
  toPlayer,
  toRound,
  type GroupRow,
  type MatchRow,
  type PlayerRow,
  type RoundRow,
} from "./supabaseMapping";

/** Antwort von Supabase auspacken: Fehler als verständliche Exception. */
function unwrap<T = unknown>({ data, error }: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (error) {
    if (error.code === "23505") throw new Error("Dieser Eintrag existiert bereits (z. B. gleicher Spielername).");
    if (error.code === "42501") throw new Error("Dafür fehlen dir die Rechte.");
    if (/failed to fetch|network/i.test(error.message)) throw new Error(OFFLINE_MESSAGE);
    throw new Error(error.message);
  }
  return data as T;
}

const MATCH_DETAIL = "*, match_players(*), rounds(*)";

/**
 * Repository ab Phase 4: gemeinsame Daten in Supabase (SPEC §2).
 * Zugriffsrechte setzt die Datenbank per RLS durch; hier wird nur übersetzt.
 */
export class SupabaseRepository implements Repository {
  constructor(
    private db: SupabaseClient,
    private photos: PhotoStore,
  ) {}

  // ---------- Spieler ----------

  async listPlayers(opts?: { includeArchived?: boolean }): Promise<Player[]> {
    let query = this.db.from("players").select("*");
    if (!opts?.includeArchived) query = query.eq("archived", false);
    const rows = unwrap<PlayerRow[]>(await query);
    return rows.map(toPlayer).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  async savePlayer(input: PlayerInput): Promise<Player> {
    const name = input.name.trim();
    if (name === "") throw new Error("Der Spielername darf nicht leer sein.");
    const values = { name, photo_path: input.photoPath ?? null, archived: input.archived };
    const query =
      input.id === undefined
        ? this.db.from("players").insert(values)
        : this.db.from("players").update(values).eq("id", input.id);
    return toPlayer(unwrap<PlayerRow>(await query.select().single()));
  }

  // ---------- Doppelkopf-Runden ----------

  async listGroups(): Promise<Group[]> {
    const rows = unwrap<GroupRow[]>(await this.db.from("groups").select("*, group_members(player_id, position)").order("name"));
    return rows.map(toGroup);
  }

  async saveGroup(input: GroupInput): Promise<Group> {
    const id = unwrap<string>(
      await this.db.rpc("save_group", { p_id: input.id ?? null, p_name: input.name, p_member_ids: input.memberIds }),
    );
    const row = unwrap<GroupRow>(
      await this.db.from("groups").select("*, group_members(player_id, position)").eq("id", id).single(),
    );
    return toGroup(row);
  }

  // ---------- Partien ----------

  async listMatches(filter?: MatchFilter): Promise<Match[]> {
    const rows = unwrap<MatchRow[]>(await this.filtered("*", filter));
    return rows.map(toMatch);
  }

  async listMatchDetails(filter?: MatchFilter): Promise<MatchDetail[]> {
    const rows = unwrap<MatchRow[]>(await this.filtered(MATCH_DETAIL, filter));
    return rows.map(toMatchDetail);
  }

  private filtered(columns: string, filter?: MatchFilter) {
    let query = this.db.from("matches").select(columns);
    if (filter?.gameType) query = query.eq("game_type", filter.gameType);
    if (filter?.groupId) query = query.eq("group_id", filter.groupId);
    if (filter?.status) query = query.eq("status", filter.status);
    return query.order("started_at", { ascending: false });
  }

  async getMatch(id: string): Promise<MatchDetail> {
    const row = unwrap<MatchRow | null>(await this.db.from("matches").select(MATCH_DETAIL).eq("id", id).maybeSingle());
    if (!row) throw new Error("Partie nicht gefunden.");
    return toMatchDetail(row);
  }

  async createMatch(m: NewMatch): Promise<MatchDetail> {
    m.participants.forEach((p, i) => {
      if ("guestName" in p && p.guestName.trim() === "") {
        throw new Error(`Teilnehmer ${i + 1}: Der Gastname darf nicht leer sein.`);
      }
    });
    const participants = m.participants.map((p) =>
      "playerId" in p ? { player_id: p.playerId } : { guest_name: p.guestName.trim() },
    );
    const id = unwrap<string>(
      await this.db.rpc("create_match", {
        p_game_type: m.gameType,
        p_group_id: m.groupId ?? null,
        p_settings: m.settings,
        p_participants: participants,
      }),
    );
    return this.getMatch(id);
  }

  async saveRound(r: RoundInput): Promise<Round> {
    if (!Number.isInteger(r.roundNo) || r.roundNo < 1) {
      throw new Error("Die Rundennummer muss eine ganze Zahl ab 1 sein.");
    }
    const row = unwrap<RoundRow>(
      await this.db
        .from("rounds")
        .upsert({ match_id: r.matchId, round_no: r.roundNo, input: r.input, points: r.points }, { onConflict: "match_id,round_no" })
        .select()
        .single(),
    );
    return toRound(row);
  }

  async finishMatch(id: string, result: MatchResult): Promise<void> {
    unwrap(
      await this.db.rpc("finish_match", {
        p_match_id: id,
        p_final_scores: result.finalScores,
        p_winner_ids: result.winnerIds,
      }),
    );
  }

  async deleteMatch(id: string): Promise<void> {
    const deleted = unwrap<{ id: string }[]>(await this.db.from("matches").delete().eq("id", id).select("id"));
    // RLS lässt Nicht-Admins still nichts löschen – das melden wir deutlich
    if (deleted.length === 0) throw new Error("Die Partie wurde nicht gelöscht (nur Admins dürfen löschen).");
  }

  // ---------- Export und Import ----------

  async exportAll(): Promise<DataSnapshot> {
    const [players, groups, details] = await Promise.all([
      this.listPlayers({ includeArchived: true }),
      this.listGroups(),
      this.listMatchDetails(),
    ]);
    return {
      players,
      groups,
      matches: details.map((d) => d.match),
      matchPlayers: details.flatMap((d) => d.players),
      rounds: details.flatMap((d) => d.rounds),
    };
  }

  /**
   * Übernimmt ein Backup (z. B. aus der lokalen Phase). Einträge mit gleicher ID werden
   * überschrieben. Fotos aus dem Browser-Speicher werden in den Foto-Speicher hochgeladen.
   */
  async importAll(data: DataSnapshot): Promise<void> {
    const snapshot = checkSnapshot(data);

    const players = await Promise.all(
      snapshot.players.map(async (p) => {
        if (!p.photoPath?.startsWith("data:")) return p;
        const blob = await (await fetch(p.photoPath)).blob();
        return { ...p, photoPath: await this.photos.upload(p.id, blob) };
      }),
    );
    if (players.length) unwrap(await this.db.from("players").upsert(players.map(fromPlayer)));
    for (const g of snapshot.groups) {
      unwrap(await this.db.rpc("save_group", { p_id: g.id, p_name: g.name, p_member_ids: g.memberIds }));
    }
    // Konten der lokalen Phase gibt es nicht – created_by bleibt leer
    const matches = snapshot.matches.map((m) => ({ ...fromMatch(m), created_by: null }));
    if (matches.length) unwrap(await this.db.from("matches").upsert(matches));
    if (snapshot.matchPlayers.length) unwrap(await this.db.from("match_players").upsert(snapshot.matchPlayers.map(fromMatchPlayer)));
    if (snapshot.rounds.length) unwrap(await this.db.from("rounds").upsert(snapshot.rounds.map(fromRound)));
  }
}
