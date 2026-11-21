import { describe, expect, it } from "vitest";
import { computeResult, computeTotals, rankParticipants, toParticipants } from "./match";
import type { MatchPlayer, Player, Round } from "./types";

function round(roundNo: number, points: Record<string, number>): Round {
  const t = "2026-11-20T19:00:00.000Z";
  return { id: `r${roundNo}`, matchId: "m1", roundNo, input: {}, points, createdAt: t, updatedAt: t };
}

describe("computeTotals", () => {
  it("summiert die Rundenpunkte je Teilnehmer", () => {
    const rounds = [round(1, { a: 10, b: 5 }), round(2, { a: -3, b: 7 })];
    expect(computeTotals(["a", "b"], rounds)).toEqual({ a: 7, b: 12 });
  });

  it("ohne Runden steht jeder bei 0", () => {
    expect(computeTotals(["a", "b"], [])).toEqual({ a: 0, b: 0 });
  });
});

describe("computeResult", () => {
  it("der Teilnehmer mit den meisten Punkten gewinnt", () => {
    expect(computeResult({ a: 210, b: 150, c: 90 })).toEqual({
      finalScores: { a: 210, b: 150, c: 90 },
      winnerIds: ["a"],
    });
  });

  it("H1: Gleichstand ergibt zwei Sieger", () => {
    expect(computeResult({ a: 12, b: 12, c: -24 }).winnerIds).toEqual(["a", "b"]);
  });
});

describe("rankParticipants", () => {
  it("sortiert absteigend, Gleichstand teilt den Rang", () => {
    const ps = [
      { id: "a", name: "Fritzi Fuchs" },
      { id: "b", name: "Bruno Bär" },
      { id: "c", name: "Emil Eule" },
    ];
    const ranking = rankParticipants(ps, { a: 5, b: 20, c: 20 });
    expect(ranking.map((r) => [r.participant.id, r.rank])).toEqual([
      ["b", 1],
      ["c", 1],
      ["a", 3],
    ]);
  });
});

describe("toParticipants", () => {
  it("nimmt Spielernamen aus der Liste, Gastnamen direkt, sortiert nach Sitz", () => {
    const players: Player[] = [
      { id: "x", name: "Hanna Hase", archived: true, createdAt: "2026-11-01T00:00:00.000Z" },
    ];
    const mps: MatchPlayer[] = [
      { id: "mp2", matchId: "m1", guestName: "Gustav Gast", seat: 2, isWinner: false },
      { id: "mp1", matchId: "m1", playerId: "x", seat: 1, isWinner: false },
    ];
    expect(toParticipants(mps, players)).toEqual([
      { id: "mp1", name: "Hanna Hase", playerId: "x", photoPath: undefined, archived: true },
      { id: "mp2", name: "Gustav Gast", playerId: undefined, photoPath: undefined, archived: undefined },
    ]);
  });
});
