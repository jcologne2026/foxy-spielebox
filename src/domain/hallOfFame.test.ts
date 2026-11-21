import { describe, expect, it } from "vitest";
import { computeHallOfFame, formatAverage, formatWinRate } from "./hallOfFame";
import { computeResult } from "./match";
import type { GameType, MatchDetail, MatchPlayer, Player } from "./types";

// Nur Fantasienamen (CLAUDE.md)
const players: Player[] = ["Fritzi Fuchs", "Bruno Bär", "Emil Eule", "Hanna Hase", "Otto Otter"].map((name, i) => ({
  id: `pl${i + 1}`,
  name,
  archived: name === "Otto Otter",
  createdAt: "2026-11-01T00:00:00.000Z",
}));

let counter = 0;

/**
 * Beendete Partie: `scores` je Spieler-ID oder Gast („gast:Name“); Sieger = Höchstwert.
 */
function finished(gameType: GameType, day: number, scores: Record<string, number>, groupId?: string): MatchDetail {
  const id = `m${++counter}`;
  const date = `2026-11-${String(day).padStart(2, "0")}T20:00:00.000Z`;
  const mps: MatchPlayer[] = Object.keys(scores).map((key, i) => ({
    id: `${id}-mp${i}`,
    matchId: id,
    ...(key.startsWith("gast:") ? { guestName: key.slice(5) } : { playerId: key }),
    seat: i + 1,
    isWinner: false,
  }));
  const totals = Object.fromEntries(mps.map((mp, i) => [mp.id, Object.values(scores)[i]]));
  const result = computeResult(totals);
  for (const mp of mps) {
    mp.finalScore = result.finalScores[mp.id];
    mp.isWinner = result.winnerIds.includes(mp.id);
  }
  return {
    match: { id, gameType, groupId, status: "finished", settings: {}, startedAt: date, finishedAt: date },
    players: mps,
    rounds: [],
  };
}

const row = (hof: ReturnType<typeof computeHallOfFame>, playerId: string) => hof.rows.find((r) => r.playerId === playerId);

describe("Hall of Fame", () => {
  it("H1: Gleichstand ergibt zwei Sieger – der Sieg zählt für beide", () => {
    const d = finished("flip7", 1, { pl1: 210, pl2: 210, pl3: 100 });
    const hof = computeHallOfFame([d], players, { gameType: "flip7" });
    expect(row(hof, "pl1")?.wins).toBe(1);
    expect(row(hof, "pl2")?.wins).toBe(1);
    expect(row(hof, "pl3")?.wins).toBe(0);
  });

  it("H2: Gäste fehlen in allen Kennzahlen und Rekorden", () => {
    const d = finished("flip7", 1, { "gast:Gustav Gast": 300, pl1: 150, pl2: 100 });
    const hof = computeHallOfFame([d], players, { gameType: "flip7" });
    expect(hof.rows.map((r) => r.name)).toEqual(["Fritzi Fuchs", "Bruno Bär"]);
    expect(hof.highestScore?.name).toBe("Fritzi Fuchs");
    expect(hof.longestStreak).toBeNull(); // der Gast hat gewonnen, kein Spieler
  });

  it("H3: Siegquote bei 4 Partien „–“, ab 5 Partien in Prozent", () => {
    const four = [1, 2, 3, 4].map((day) => finished("wizard", day, { pl1: 100, pl2: 50, pl3: 0 }));
    const hof4 = computeHallOfFame(four, players, { gameType: "wizard" });
    expect(row(hof4, "pl1")?.winRate).toBeNull();
    expect(formatWinRate(row(hof4, "pl1")!.winRate)).toBe("–");

    const five = [...four, finished("wizard", 5, { pl1: 0, pl2: 50, pl3: 10 })];
    const hof5 = computeHallOfFame(five, players, { gameType: "wizard" });
    expect(row(hof5, "pl1")?.winRate).toBe(80);
    expect(formatWinRate(row(hof5, "pl1")!.winRate)).toBe("80 %");
  });

  it("H4: Serie 3 wird durch eine Niederlage beendet", () => {
    const ds = [
      finished("flip7", 1, { pl1: 200, pl2: 100, pl3: 0 }),
      finished("flip7", 2, { pl1: 200, pl2: 100, pl3: 0 }),
      finished("flip7", 3, { pl1: 200, pl2: 100, pl3: 0 }),
      finished("flip7", 4, { pl1: 50, pl2: 200, pl3: 0 }), // Niederlage
      finished("flip7", 5, { pl1: 200, pl2: 100, pl3: 0 }),
    ];
    const hof = computeHallOfFame(ds, players, { gameType: "flip7" });
    expect(row(hof, "pl1")?.longestStreak).toBe(3);
    expect(hof.longestStreak).toEqual({ playerId: "pl1", name: "Fritzi Fuchs", length: 3 });
  });

  it("Partien ohne Teilnahme unterbrechen die Serie nicht", () => {
    const ds = [
      finished("flip7", 1, { pl1: 200, pl2: 0, pl3: 0 }),
      finished("flip7", 2, { pl2: 200, pl3: 100, pl4: 0 }), // pl1 nicht dabei
      finished("flip7", 3, { pl1: 200, pl2: 0, pl3: 0 }),
    ];
    expect(row(computeHallOfFame(ds, players, { gameType: "flip7" }), "pl1")?.longestStreak).toBe(2);
  });

  it("H5: Filter Runde A ignoriert Partien von Runde B", () => {
    const ds = [
      finished("doppelkopf", 1, { pl1: 10, pl2: 5, pl3: -5, pl4: -10 }, "A"),
      finished("doppelkopf", 2, { pl1: -20, pl2: 20, pl5: 10, pl3: -10 }, "B"),
    ];
    const hofA = computeHallOfFame(ds, players, { gameType: "doppelkopf", groupId: "A" });
    expect(row(hofA, "pl1")).toMatchObject({ matches: 1, totalScore: 10 });
    expect(row(hofA, "pl5")).toBeUndefined();

    const total = computeHallOfFame(ds, players, { gameType: "doppelkopf" });
    expect(row(total, "pl1")).toMatchObject({ matches: 2, totalScore: -10, avgScore: -5 });
  });

  it("zählt nur beendete Partien des gewählten Spiels", () => {
    const open = finished("flip7", 1, { pl1: 300, pl2: 0, pl3: 0 });
    open.match.status = "open";
    const other = finished("wizard", 2, { pl1: 300, pl2: 0, pl3: 0 });
    expect(computeHallOfFame([open, other], players, { gameType: "flip7" }).rows).toEqual([]);
  });

  it("Doppelkopf sortiert nach Ewiger Tabelle, andere Spiele nach Siegen", () => {
    const dk = [
      finished("doppelkopf", 1, { pl1: 30, pl2: -10, pl3: -10, pl4: -10 }),
      finished("doppelkopf", 2, { pl1: -5, pl2: 6, pl3: 4, pl4: -5 }),
      finished("doppelkopf", 3, { pl1: -5, pl2: 6, pl3: 4, pl4: -5 }),
    ];
    // pl2 hat 2 Siege, pl1 aber die meisten Punkte
    expect(computeHallOfFame(dk, players, { gameType: "doppelkopf" }).rows[0].playerId).toBe("pl1");

    const flip = [
      finished("flip7", 1, { pl1: 400, pl2: 10, pl3: 0 }),
      finished("flip7", 2, { pl1: 10, pl2: 200, pl3: 0 }),
      finished("flip7", 3, { pl1: 10, pl2: 200, pl3: 0 }),
    ];
    expect(computeHallOfFame(flip, players, { gameType: "flip7" }).rows[0].playerId).toBe("pl2");
  });

  it("Höchste Punktzahl mit Spieler, Wert und Datum; archivierte Spieler bleiben sichtbar", () => {
    const ds = [finished("flip7", 3, { pl5: 260, pl1: 210, pl2: 0 }), finished("flip7", 4, { pl1: 230, pl2: 0, pl3: 0 })];
    const hof = computeHallOfFame(ds, players, { gameType: "flip7" });
    expect(hof.highestScore).toEqual({ playerId: "pl5", name: "Otto Otter", value: 260, date: "2026-11-03T20:00:00.000Z" });
    expect(row(hof, "pl5")?.archived).toBe(true);
    expect(row(hof, "pl1")?.bestScore).toBe(230);
  });

  it("formatiert Ø Punkte mit einer Nachkommastelle", () => {
    expect(formatAverage(12.5)).toBe("12,5");
    expect(formatAverage(-5)).toBe("-5,0");
  });
});
