import type { Group, Player } from "../domain/types";
import { newId, nowIso } from "./ids";
import { emptyData, type LocalData, type LocalRepository } from "./localRepository";

// Test-Spieler für die Entwicklung – nur Fantasienamen (CLAUDE.md).
// Aufbau wie in PRD §4.1: zwei Gastgeber spielen in beiden Runden,
// dazu je ein Freundespaar.
export const SEED_HOSTS = ["Fritzi Fuchs", "Bruno Bär"];
export const SEED_PAIR_A = ["Emil Eule", "Hanna Hase"];
export const SEED_PAIR_B = ["Otto Otter", "Lina Libelle"];

/** Baut einen frischen Datenbestand mit 6 Spielern und den Runden A und B. */
export function createSeedData(): LocalData {
  const createdAt = nowIso();
  const makePlayer = (name: string): Player => ({ id: newId(), name, archived: false, createdAt });

  const hosts = SEED_HOSTS.map(makePlayer);
  const pairA = SEED_PAIR_A.map(makePlayer);
  const pairB = SEED_PAIR_B.map(makePlayer);

  const makeGroup = (name: string, members: Player[]): Group => ({
    id: newId(),
    name,
    gameType: "doppelkopf",
    memberIds: members.map((p) => p.id),
  });

  return {
    ...emptyData(),
    players: [...hosts, ...pairA, ...pairB],
    groups: [makeGroup("Runde A", [...hosts, ...pairA]), makeGroup("Runde B", [...hosts, ...pairB])],
  };
}

/**
 * Schreibt die Test-Spieler, aber nur wenn noch gar nichts gespeichert ist –
 * echte Eingaben werden nie überschrieben.
 * @returns true, wenn Test-Spieler angelegt wurden.
 */
export function seedIfEmpty(repo: LocalRepository): boolean {
  if (!repo.isEmpty()) {
    return false;
  }
  repo.replaceAll(createSeedData());
  return true;
}
