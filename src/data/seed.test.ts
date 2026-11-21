import { beforeEach, describe, expect, it } from "vitest";
import { LocalRepository } from "./localRepository";
import { MemoryStorage } from "./memoryStorage";
import { createSeedData, SEED_HOSTS, seedIfEmpty } from "./seed";

describe("createSeedData", () => {
  const data = createSeedData();

  it("enthält 6 aktive Spieler mit verschiedenen Namen", () => {
    expect(data.players).toHaveLength(6);
    expect(new Set(data.players.map((p) => p.name)).size).toBe(6);
    expect(data.players.every((p) => !p.archived)).toBe(true);
  });

  it("enthält die Doppelkopf-Runden A und B mit je 4 bekannten Spielern", () => {
    const playerIds = new Set(data.players.map((p) => p.id));
    expect(data.groups.map((g) => g.name)).toEqual(["Runde A", "Runde B"]);
    for (const g of data.groups) {
      expect(g.gameType).toBe("doppelkopf");
      expect(g.memberIds).toHaveLength(4);
      expect(g.memberIds.every((id) => playerIds.has(id))).toBe(true);
    }
  });

  it("die beiden Gastgeber spielen in beiden Runden, sonst niemand", () => {
    const [a, b] = data.groups;
    const shared = a.memberIds.filter((id) => b.memberIds.includes(id));
    const sharedNames = shared.map((id) => data.players.find((p) => p.id === id)?.name);
    expect(sharedNames.sort()).toEqual([...SEED_HOSTS].sort());
  });

  it("startet ohne Partien und Runden", () => {
    expect(data.matches).toEqual([]);
    expect(data.matchPlayers).toEqual([]);
    expect(data.rounds).toEqual([]);
  });
});

describe("seedIfEmpty", () => {
  let repo: LocalRepository;

  beforeEach(() => {
    repo = new LocalRepository(new MemoryStorage());
  });

  it("legt bei leerem Speicher die Test-Spieler an", async () => {
    expect(seedIfEmpty(repo)).toBe(true);
    expect(await repo.listPlayers()).toHaveLength(6);
    expect(await repo.listGroups()).toHaveLength(2);
  });

  it("überschreibt vorhandene Daten nicht", async () => {
    await repo.savePlayer({ name: "Klara Kauz", archived: false });
    expect(seedIfEmpty(repo)).toBe(false);
    const names = (await repo.listPlayers()).map((p) => p.name);
    expect(names).toEqual(["Klara Kauz"]);
  });

  it("ein zweiter Aufruf ändert nichts mehr", async () => {
    seedIfEmpty(repo);
    const before = await repo.listPlayers();
    expect(seedIfEmpty(repo)).toBe(false);
    expect(await repo.listPlayers()).toEqual(before);
  });
});
