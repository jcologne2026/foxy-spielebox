// Partie-Logik nach SPEC §5 – reine Funktionen ohne React und Datenbank.
import type { MatchPlayer, MatchResult, Participant, Player, Round } from "./types";

/** Teilnehmer mit Anzeigenamen; Spieler aus der Liste, sonst Gast. */
export function toParticipants(matchPlayers: MatchPlayer[], players: Player[]): Participant[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  return [...matchPlayers]
    .sort((a, b) => a.seat - b.seat)
    .map((mp) => {
      const player = mp.playerId ? byId.get(mp.playerId) : undefined;
      return {
        id: mp.id,
        name: player?.name ?? mp.guestName ?? "Unbekannt",
        playerId: mp.playerId,
        photoPath: player?.photoPath,
        archived: player?.archived,
      };
    });
}

/** Gesamtstand: Summe der Rundenpunkte je Teilnehmer (fehlende Werte zählen 0). */
export function computeTotals(participantIds: string[], rounds: Round[]): Record<string, number> {
  const totals: Record<string, number> = Object.fromEntries(participantIds.map((id) => [id, 0]));
  for (const round of rounds) {
    for (const id of participantIds) {
      totals[id] += round.points[id] ?? 0;
    }
  }
  return totals;
}

/** Abschluss: Endstand = Gesamtstand, Sieger = alle mit dem höchsten Endstand. */
export function computeResult(totals: Record<string, number>): MatchResult {
  const values = Object.values(totals);
  if (values.length === 0) {
    return { finalScores: {}, winnerIds: [] };
  }
  const best = Math.max(...values);
  return {
    finalScores: { ...totals },
    winnerIds: Object.keys(totals).filter((id) => totals[id] === best),
  };
}

export interface RankingEntry {
  participant: Participant;
  total: number;
  /** 1 = vorne; bei Gleichstand gleicher Rang. */
  rank: number;
}

/** Rangliste nach Gesamtstand absteigend; Gleichstand teilt sich den Rang, dann Sitzreihenfolge. */
export function rankParticipants(participants: Participant[], totals: Record<string, number>): RankingEntry[] {
  const sorted = participants
    .map((participant, seatIndex) => ({ participant, total: totals[participant.id] ?? 0, seatIndex }))
    .sort((a, b) => b.total - a.total || a.seatIndex - b.seatIndex);
  return sorted.map((entry) => ({
    participant: entry.participant,
    total: entry.total,
    rank: sorted.findIndex((e) => e.total === entry.total) + 1,
  }));
}
