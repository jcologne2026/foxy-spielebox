import { beforeEach, describe, expect, it } from "vitest";
import type { NewParticipant } from "../domain/types";
import { emptyData, LocalRepository, STORAGE_KEY } from "./localRepository";
import { MemoryStorage } from "./memoryStorage";

// Nur Fantasienamen in Tests (CLAUDE.md)
let storage: MemoryStorage;
let repo: LocalRepository;

beforeEach(() => {
  storage = new MemoryStorage();
  repo = new LocalRepository(storage);
});

async function addPlayers(...names: string[]) {
  const players = [];
  for (const name of names) {
    players.push(await repo.savePlayer({ name, archived: false }));
  }
  return players;
}

describe("Spieler", () => {
  it("startet mit leerer Liste", async () => {
    expect(await repo.listPlayers()).toEqual([]);
  });

  it("legt einen neuen Spieler mit id und Zeitstempel an", async () => {
    const p = await repo.savePlayer({ name: "  Lotte Luchs  ", archived: false });
    expect(p.id).toBeTruthy();
    expect(p.createdAt).toBeTruthy();
    expect(p.name).toBe("Lotte Luchs");
    expect(await repo.listPlayers()).toEqual([p]);
  });

  it("lehnt leere und doppelte Namen ab (ohne Groß-/Kleinschreibung)", async () => {
    await addPlayers("Lotte Luchs");
    await expect(repo.savePlayer({ name: "   ", archived: false })).rejects.toThrow("leer");
    await expect(repo.savePlayer({ name: "lotte luchs", archived: false })).rejects.toThrow(
      "bereits",
    );
  });

  it("erlaubt den Namen eines archivierten Spielers erneut", async () => {
    const [old] = await addPlayers("Lotte Luchs");
    await repo.savePlayer({ ...old, archived: true });
    await expect(repo.savePlayer({ name: "Lotte Luchs", archived: false })).resolves.toBeTruthy();
  });

  it("ändert einen Spieler, createdAt bleibt", async () => {
    const [p] = await addPlayers("Lotte Luchs");
    const changed = await repo.savePlayer({ ...p, name: "Lotte Lux" });
    expect(changed).toEqual({ ...p, name: "Lotte Lux" });
    await expect(repo.savePlayer({ id: "gibt-es-nicht", name: "X", archived: false })).rejects.toThrow(
      "nicht gefunden",
    );
  });

  it("blendet Archivierte aus, außer mit includeArchived", async () => {
    const [a] = await addPlayers("Anton Ameise", "Berta Biber");
    await repo.savePlayer({ ...a, archived: true });
    expect((await repo.listPlayers()).map((p) => p.name)).toEqual(["Berta Biber"]);
    expect((await repo.listPlayers({ includeArchived: true })).map((p) => p.name)).toEqual([
      "Anton Ameise",
      "Berta Biber",
    ]);
  });
});

describe("Partien anlegen", () => {
  it("nummeriert die Sitze 1…n, auch mit Gast", async () => {
    const [a, b] = await addPlayers("Anton Ameise", "Berta Biber");
    const detail = await repo.createMatch({
      gameType: "flip7",
      settings: { target: 200 },
      participants: [{ playerId: a.id }, { guestName: "Gustav Gast" }, { playerId: b.id }],
    });
    expect(detail.match.status).toBe("open");
    expect(detail.players.map((p) => p.seat)).toEqual([1, 2, 3]);
    expect(detail.players[1]).toMatchObject({ guestName: "Gustav Gast", isWinner: false });
    expect(detail.players[1].playerId).toBeUndefined();
    expect(await repo.getMatch(detail.match.id)).toEqual(detail);
  });

  it("lehnt ungültige Teilnehmer ab", async () => {
    const [a] = await addPlayers("Anton Ameise");
    const create = (participants: NewParticipant[]) =>
      repo.createMatch({ gameType: "flip7", settings: {}, participants });

    const both = { playerId: a.id, guestName: "Gustav Gast" } as NewParticipant;
    const neither = {} as NewParticipant;
    await expect(create([both])).rejects.toThrow("genau ein");
    await expect(create([neither])).rejects.toThrow("genau ein");
    await expect(create([{ playerId: "gibt-es-nicht" }])).rejects.toThrow("nicht gefunden");
    await expect(create([{ playerId: a.id }, { playerId: a.id }])).rejects.toThrow("doppelt");
    await expect(create([{ guestName: "  " }])).rejects.toThrow("leer");
    expect(await repo.listMatches()).toEqual([]); // nichts halb gespeichert
  });

  it("verlangt bei Doppelkopf eine gültige Runde", async () => {
    const players = await addPlayers("Anton Ameise", "Berta Biber", "Carlo Chamäleon", "Dora Dachs");
    const participants = players.map((p) => ({ playerId: p.id }));
    await expect(
      repo.createMatch({ gameType: "doppelkopf", settings: {}, participants }),
    ).rejects.toThrow("Runde");

    // Runde direkt in den Speicher schreiben (Verwaltung kommt später)
    const data = JSON.parse(storage.getItem(STORAGE_KEY)!);
    data.groups.push({ id: "g1", name: "Runde A", gameType: "doppelkopf", memberIds: players.map((p) => p.id) });
    storage.setItem(STORAGE_KEY, JSON.stringify(data));

    const detail = await repo.createMatch({ gameType: "doppelkopf", groupId: "g1", settings: {}, participants });
    expect(detail.match.groupId).toBe("g1");
    await expect(
      repo.createMatch({ gameType: "flip7", groupId: "g1", settings: {}, participants }),
    ).rejects.toThrow("Nur Doppelkopf");
  });
});

describe("Runden", () => {
  async function openMatch() {
    const [a, b] = await addPlayers("Anton Ameise", "Berta Biber");
    return repo.createMatch({
      gameType: "flip7",
      settings: {},
      participants: [{ playerId: a.id }, { playerId: b.id }],
    });
  }

  it("legt Runden an und ersetzt sie bei Korrektur", async () => {
    const { match, players } = await openMatch();
    const [p1, p2] = players.map((p) => p.id);

    const first = await repo.saveRound({ matchId: match.id, roundNo: 1, input: {}, points: { [p1]: 10, [p2]: 5 } });
    await repo.saveRound({ matchId: match.id, roundNo: 2, input: {}, points: { [p1]: 0, [p2]: 7 } });
    const fixed = await repo.saveRound({ matchId: match.id, roundNo: 1, input: {}, points: { [p1]: 12, [p2]: 5 } });

    expect(fixed.id).toBe(first.id);
    expect(fixed.createdAt).toBe(first.createdAt);
    const { rounds } = await repo.getMatch(match.id);
    expect(rounds.map((r) => [r.roundNo, r.points[p1]])).toEqual([
      [1, 12],
      [2, 0],
    ]);
  });

  it("lehnt falsche Partie, Rundennummer und fremde Teilnehmer ab", async () => {
    const { match } = await openMatch();
    await expect(repo.saveRound({ matchId: "gibt-es-nicht", roundNo: 1, input: {}, points: {} })).rejects.toThrow(
      "Partie nicht gefunden",
    );
    await expect(repo.saveRound({ matchId: match.id, roundNo: 0, input: {}, points: {} })).rejects.toThrow(
      "Rundennummer",
    );
    await expect(
      repo.saveRound({ matchId: match.id, roundNo: 1, input: {}, points: { fremd: 3 } }),
    ).rejects.toThrow("nicht in dieser Partie");
  });
});

describe("Partien auflisten, abschließen, löschen", () => {
  it("filtert nach Spiel und Status", async () => {
    const [a] = await addPlayers("Anton Ameise");
    const participants = [{ playerId: a.id }];
    const flip = await repo.createMatch({ gameType: "flip7", settings: {}, participants });
    await repo.createMatch({ gameType: "wizard", settings: {}, participants });
    await repo.finishMatch(flip.match.id, { finalScores: { [flip.players[0].id]: 0 }, winnerIds: [] });

    expect(await repo.listMatches()).toHaveLength(2);
    expect((await repo.listMatches({ gameType: "flip7" })).map((m) => m.id)).toEqual([flip.match.id]);
    expect((await repo.listMatches({ status: "open" })).map((m) => m.gameType)).toEqual(["wizard"]);
  });

  it("setzt beim Abschluss Status, Endstände und Sieger (auch geteilt)", async () => {
    const [a, b, c] = await addPlayers("Anton Ameise", "Berta Biber", "Carlo Chamäleon");
    const { match, players } = await repo.createMatch({
      gameType: "flip7",
      settings: {},
      participants: [a, b, c].map((p) => ({ playerId: p.id })),
    });
    const [p1, p2, p3] = players.map((p) => p.id);

    await expect(repo.finishMatch(match.id, { finalScores: { [p1]: 210 }, winnerIds: [p1] })).rejects.toThrow(
      "Endstand",
    );
    await repo.finishMatch(match.id, { finalScores: { [p1]: 210, [p2]: 210, [p3]: 150 }, winnerIds: [p1, p2] });

    const detail = await repo.getMatch(match.id);
    expect(detail.match.status).toBe("finished");
    expect(detail.match.finishedAt).toBeTruthy();
    expect(detail.players.map((p) => [p.finalScore, p.isWinner])).toEqual([
      [210, true],
      [210, true],
      [150, false],
    ]);
  });

  it("löscht eine Partie samt Teilnehmern und Runden", async () => {
    const [a] = await addPlayers("Anton Ameise");
    const { match, players } = await repo.createMatch({ gameType: "flip7", settings: {}, participants: [{ playerId: a.id }] });
    await repo.saveRound({ matchId: match.id, roundNo: 1, input: {}, points: { [players[0].id]: 5 } });

    await repo.deleteMatch(match.id);
    await expect(repo.getMatch(match.id)).rejects.toThrow("Partie nicht gefunden");
    const data = JSON.parse(storage.getItem(STORAGE_KEY)!);
    expect(data.matchPlayers).toEqual([]);
    expect(data.rounds).toEqual([]);
    expect(data.players).toHaveLength(1); // Spieler bleiben erhalten
  });
});

describe("Speicher", () => {
  it("behält Daten über ein Neuladen hinweg", async () => {
    await addPlayers("Lotte Luchs");
    const afterReload = new LocalRepository(storage);
    expect((await afterReload.listPlayers()).map((p) => p.name)).toEqual(["Lotte Luchs"]);
  });

  it("meldet beschädigte Daten, statt sie zu überschreiben", async () => {
    storage.setItem(STORAGE_KEY, "{kaputt");
    await expect(repo.listPlayers()).rejects.toThrow("beschädigt");
    await expect(repo.savePlayer({ name: "Lotte Luchs", archived: false })).rejects.toThrow("beschädigt");
    expect(storage.getItem(STORAGE_KEY)).toBe("{kaputt");
  });

  it("isEmpty und replaceAll", async () => {
    expect(repo.isEmpty()).toBe(true);
    repo.replaceAll(emptyData());
    expect(repo.isEmpty()).toBe(false);
  });
});
