import type { DataSnapshot } from "./repository";

const KEYS = ["players", "groups", "matches", "matchPlayers", "rounds"] as const;

/**
 * Prüft, ob ein eingelesenes JSON-Objekt ein Backup dieser App ist.
 * Wirft einen verständlichen Fehler, statt kaputte Daten zu übernehmen.
 */
export function checkSnapshot(value: unknown): DataSnapshot {
  if (typeof value !== "object" || value === null) {
    throw new Error("Die Datei ist kein Backup der Spielebox.");
  }
  const record = value as Record<string, unknown>;
  for (const key of KEYS) {
    if (!Array.isArray(record[key])) {
      throw new Error(`Die Datei ist kein Backup der Spielebox (es fehlt „${key}“).`);
    }
  }
  const data = record as unknown as DataSnapshot;
  const ids = (list: { id: string }[]) => new Set(list.map((x) => x.id));
  const players = ids(data.players);
  const matches = ids(data.matches);
  const matchPlayers = ids(data.matchPlayers);

  // Verweise prüfen, damit nach dem Import nichts ins Leere zeigt
  if (data.groups.some((g) => !g.memberIds?.every((id) => players.has(id)))) {
    throw new Error("Backup fehlerhaft: Eine Runde verweist auf einen unbekannten Spieler.");
  }
  if (data.matchPlayers.some((mp) => !matches.has(mp.matchId) || (mp.playerId && !players.has(mp.playerId)))) {
    throw new Error("Backup fehlerhaft: Ein Teilnehmer verweist auf eine unbekannte Partie oder einen unbekannten Spieler.");
  }
  if (data.rounds.some((r) => !matches.has(r.matchId) || !Object.keys(r.points ?? {}).every((id) => matchPlayers.has(id)))) {
    throw new Error("Backup fehlerhaft: Eine Runde verweist auf eine unbekannte Partie oder einen unbekannten Teilnehmer.");
  }
  return { players: data.players, groups: data.groups, matches: data.matches, matchPlayers: data.matchPlayers, rounds: data.rounds };
}
