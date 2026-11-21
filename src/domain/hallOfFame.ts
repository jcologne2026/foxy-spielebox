// Hall-of-Fame-Berechnung nach SPEC §6 – reine Funktion, keine eigene Tabelle.
import type { GameType, MatchDetail, Player } from "./types";

/** Siegquote erst ab so vielen Partien. */
export const MIN_MATCHES_FOR_RATE = 5;

export interface HallOfFameRow {
  playerId: string;
  name: string;
  photoPath?: string;
  archived: boolean;
  matches: number;
  wins: number;
  /** Siegquote in Prozent (0–100) oder null unter 5 Partien. */
  winRate: number | null;
  /** Ewige Tabelle: Summe der Endstände. */
  totalScore: number;
  /** Ø Punkte pro Partie, eine Nachkommastelle. */
  avgScore: number;
  /** Höchster Endstand des Spielers. */
  bestScore: number;
  /** Längste Folge gewonnener Partien. */
  longestStreak: number;
}

export interface ScoreRecord {
  playerId: string;
  name: string;
  value: number;
  /** Zeitpunkt des Partieendes (ISO). */
  date: string;
}

export interface StreakRecord {
  playerId: string;
  name: string;
  length: number;
}

export interface HallOfFame {
  rows: HallOfFameRow[];
  highestScore: ScoreRecord | null;
  longestStreak: StreakRecord | null;
}

export interface HallOfFameFilter {
  gameType: GameType;
  /** Nur Doppelkopf: Ansicht einer Runde; leer = Gesamt. */
  groupId?: string;
}

interface Entry {
  finishedAt: string;
  score: number;
  won: boolean;
}

export function computeHallOfFame(details: MatchDetail[], players: Player[], filter: HallOfFameFilter): HallOfFame {
  const playerById = new Map(players.map((p) => [p.id, p]));

  // Grundmenge: beendete Partien des Spiels (bei Doppelkopf optional nur eine Runde)
  const relevant = details.filter(
    (d) =>
      d.match.status === "finished" &&
      d.match.gameType === filter.gameType &&
      (filter.groupId === undefined || d.match.groupId === filter.groupId),
  );

  // Je Spieler alle Teilnahmen sammeln; Gäste (ohne playerId) zählen nicht
  const entries = new Map<string, Entry[]>();
  for (const d of relevant) {
    const finishedAt = d.match.finishedAt ?? d.match.startedAt;
    for (const mp of d.players) {
      if (!mp.playerId) continue;
      const list = entries.get(mp.playerId) ?? [];
      list.push({ finishedAt, score: mp.finalScore ?? 0, won: mp.isWinner });
      entries.set(mp.playerId, list);
    }
  }

  const rows: HallOfFameRow[] = [];
  let highestScore: ScoreRecord | null = null;
  let longestStreak: StreakRecord | null = null;

  for (const [playerId, list] of entries) {
    const player = playerById.get(playerId);
    const name = player?.name ?? "Unbekannt";
    list.sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));

    const matches = list.length;
    const wins = list.filter((e) => e.won).length;
    const totalScore = list.reduce((s, e) => s + e.score, 0);
    const best = list.reduce((b, e) => (e.score > b.score ? e : b), list[0]);

    // Längste Siegesserie: nur Partien des Spielers zählen, andere unterbrechen nicht
    let streak = 0;
    let longest = 0;
    for (const e of list) {
      streak = e.won ? streak + 1 : 0;
      longest = Math.max(longest, streak);
    }

    rows.push({
      playerId,
      name,
      photoPath: player?.photoPath,
      archived: player?.archived ?? false,
      matches,
      wins,
      winRate: matches >= MIN_MATCHES_FOR_RATE ? (wins / matches) * 100 : null,
      totalScore,
      avgScore: Math.round((totalScore / matches) * 10) / 10,
      bestScore: best.score,
      longestStreak: longest,
    });

    if (
      highestScore === null ||
      best.score > highestScore.value ||
      (best.score === highestScore.value && best.finishedAt < highestScore.date)
    ) {
      highestScore = { playerId, name, value: best.score, date: best.finishedAt };
    }
    if (longest > 0 && (longestStreak === null || longest > longestStreak.length)) {
      longestStreak = { playerId, name, length: longest };
    }
  }

  rows.sort(filter.gameType === "doppelkopf" ? byEternalTable : byWins);
  return { rows, highestScore, longestStreak };
}

/** Doppelkopf: nach Ewiger Tabelle. */
function byEternalTable(a: HallOfFameRow, b: HallOfFameRow): number {
  return b.totalScore - a.totalScore || b.avgScore - a.avgScore || a.name.localeCompare(b.name, "de");
}

/** Flip 7 und Wizard: nach Siegen, dann Siegquote, dann Ø Punkte. */
function byWins(a: HallOfFameRow, b: HallOfFameRow): number {
  return (
    b.wins - a.wins ||
    (b.winRate ?? -1) - (a.winRate ?? -1) ||
    b.avgScore - a.avgScore ||
    a.name.localeCompare(b.name, "de")
  );
}

/** Siegquote für die Anzeige: „67 %“ oder „–“ unter 5 Partien. */
export function formatWinRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate)} %`;
}

/** Ø Punkte mit Komma, z. B. „12,5“. */
export function formatAverage(avg: number): string {
  return avg.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
