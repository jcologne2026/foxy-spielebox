// Übersetzung zwischen Datenbank-Zeilen (snake_case) und Domain-Typen (camelCase).
// Reine Funktionen – getestet in supabaseMapping.test.ts.
import type { GameType, Group, Match, MatchDetail, MatchPlayer, MatchStatus, Player, Round } from "../domain/types";

export interface PlayerRow {
  id: string;
  name: string;
  photo_path: string | null;
  archived: boolean;
  created_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  game_type: "doppelkopf";
  group_members?: { player_id: string; position: number }[];
}

export interface MatchRow {
  id: string;
  game_type: GameType;
  group_id: string | null;
  status: MatchStatus;
  settings: Record<string, unknown> | null;
  created_by: string | null;
  started_at: string;
  finished_at: string | null;
  match_players?: MatchPlayerRow[];
  rounds?: RoundRow[];
}

export interface MatchPlayerRow {
  id: string;
  match_id: string;
  player_id: string | null;
  guest_name: string | null;
  seat: number;
  final_score: number | null;
  is_winner: boolean;
}

export interface RoundRow {
  id: string;
  match_id: string;
  round_no: number;
  input: unknown;
  points: Record<string, number>;
  created_at: string;
  updated_at: string;
}

/** null aus der Datenbank → Feld weglassen. */
const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

export function toPlayer(r: PlayerRow): Player {
  return { id: r.id, name: r.name, photoPath: opt(r.photo_path), archived: r.archived, createdAt: r.created_at };
}

export function fromPlayer(p: Player): PlayerRow {
  return { id: p.id, name: p.name, photo_path: p.photoPath ?? null, archived: p.archived, created_at: p.createdAt };
}

export function toGroup(r: GroupRow): Group {
  const members = [...(r.group_members ?? [])].sort((a, b) => a.position - b.position);
  return { id: r.id, name: r.name, gameType: "doppelkopf", memberIds: members.map((m) => m.player_id) };
}

export function toMatch(r: MatchRow): Match {
  return {
    id: r.id,
    gameType: r.game_type,
    groupId: opt(r.group_id),
    status: r.status,
    settings: r.settings ?? {},
    createdBy: opt(r.created_by),
    startedAt: r.started_at,
    finishedAt: opt(r.finished_at),
  };
}

export function fromMatch(m: Match): Omit<MatchRow, "match_players" | "rounds"> {
  return {
    id: m.id,
    game_type: m.gameType,
    group_id: m.groupId ?? null,
    status: m.status,
    settings: m.settings,
    created_by: m.createdBy ?? null,
    started_at: m.startedAt,
    finished_at: m.finishedAt ?? null,
  };
}

export function toMatchPlayer(r: MatchPlayerRow): MatchPlayer {
  return {
    id: r.id,
    matchId: r.match_id,
    playerId: opt(r.player_id),
    guestName: opt(r.guest_name),
    seat: r.seat,
    finalScore: opt(r.final_score),
    isWinner: r.is_winner,
  };
}

export function fromMatchPlayer(mp: MatchPlayer): MatchPlayerRow {
  return {
    id: mp.id,
    match_id: mp.matchId,
    player_id: mp.playerId ?? null,
    guest_name: mp.guestName ?? null,
    seat: mp.seat,
    final_score: mp.finalScore ?? null,
    is_winner: mp.isWinner,
  };
}

export function toRound(r: RoundRow): Round {
  return {
    id: r.id,
    matchId: r.match_id,
    roundNo: r.round_no,
    input: r.input,
    points: r.points ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function fromRound(r: Round): RoundRow {
  return {
    id: r.id,
    match_id: r.matchId,
    round_no: r.roundNo,
    input: r.input,
    points: r.points,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

/** Partie mit eingebetteten Teilnehmern und Runden → MatchDetail (sortiert). */
export function toMatchDetail(r: MatchRow): MatchDetail {
  return {
    match: toMatch(r),
    players: (r.match_players ?? []).map(toMatchPlayer).sort((a, b) => a.seat - b.seat),
    rounds: (r.rounds ?? []).map(toRound).sort((a, b) => a.roundNo - b.roundNo),
  };
}
