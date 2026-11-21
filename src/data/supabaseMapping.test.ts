import { describe, expect, it } from "vitest";
import type { Match, MatchPlayer, Player, Round } from "../domain/types";
import {
  fromMatch,
  fromMatchPlayer,
  fromPlayer,
  fromRound,
  toGroup,
  toMatch,
  toMatchDetail,
  toMatchPlayer,
  toPlayer,
  toRound,
  type MatchRow,
} from "./supabaseMapping";

const t = "2026-11-21T19:00:00.000Z";

describe("Supabase-Übersetzung", () => {
  it("Spieler: hin und zurück ohne Verlust, null wird weggelassen", () => {
    const p: Player = { id: "p1", name: "Fritzi Fuchs", archived: false, createdAt: t };
    expect(fromPlayer(p).photo_path).toBeNull();
    expect(toPlayer(fromPlayer(p))).toEqual(p);
    const withPhoto = { ...p, photoPath: "p1.jpg" };
    expect(toPlayer(fromPlayer(withPhoto))).toEqual(withPhoto);
  });

  it("Partie, Teilnehmer und Runde: hin und zurück ohne Verlust", () => {
    const m: Match = { id: "m1", gameType: "doppelkopf", groupId: "g1", status: "open", settings: {}, startedAt: t };
    const mp: MatchPlayer = { id: "mp1", matchId: "m1", guestName: "Gustav Gast", seat: 2, isWinner: false };
    const r: Round = { id: "r1", matchId: "m1", roundNo: 1, input: { type: "normal" }, points: { mp1: 3 }, createdAt: t, updatedAt: t };
    expect(toMatch({ ...fromMatch(m) })).toEqual(m);
    expect(toMatchPlayer(fromMatchPlayer(mp))).toEqual(mp);
    expect(toRound(fromRound(r))).toEqual(r);
  });

  it("Runde: Mitglieder nach Position sortiert", () => {
    const g = toGroup({
      id: "g1",
      name: "Runde A",
      game_type: "doppelkopf",
      group_members: [
        { player_id: "c", position: 3 },
        { player_id: "a", position: 1 },
        { player_id: "d", position: 4 },
        { player_id: "b", position: 2 },
      ],
    });
    expect(g.memberIds).toEqual(["a", "b", "c", "d"]);
  });

  it("MatchDetail: Teilnehmer nach Sitz, Runden nach Nummer", () => {
    const row: MatchRow = {
      id: "m1",
      game_type: "flip7",
      group_id: null,
      status: "finished",
      settings: { target: 200 },
      created_by: "acc1",
      started_at: t,
      finished_at: t,
      match_players: [
        { id: "b", match_id: "m1", player_id: "p2", guest_name: null, seat: 2, final_score: 10, is_winner: false },
        { id: "a", match_id: "m1", player_id: "p1", guest_name: null, seat: 1, final_score: 20, is_winner: true },
      ],
      rounds: [
        { id: "r2", match_id: "m1", round_no: 2, input: {}, points: {}, created_at: t, updated_at: t },
        { id: "r1", match_id: "m1", round_no: 1, input: {}, points: {}, created_at: t, updated_at: t },
      ],
    };
    const d = toMatchDetail(row);
    expect(d.match.createdBy).toBe("acc1");
    expect(d.match.groupId).toBeUndefined();
    expect(d.players.map((p) => p.id)).toEqual(["a", "b"]);
    expect(d.rounds.map((r) => r.roundNo)).toEqual([1, 2]);
  });
});
