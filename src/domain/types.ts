// Domain-Typen nach SPEC §3.
// Felder in camelCase; die Übersetzung in die snake_case-Spalten der
// Datenbank übernimmt ab Phase 4 das SupabaseRepository.
// Zeitstempel sind ISO-Texte in UTC, z. B. "2026-11-15T20:30:00.000Z".

export type GameType = "flip7" | "wizard" | "doppelkopf";

export type MatchStatus = "open" | "finished";

/** Eintrag der zentralen Spielerliste (Tabelle `players`). */
export interface Player {
  id: string;
  name: string;
  /** Pfad im Storage-Bucket `player-photos`; ab Phase 4. */
  photoPath?: string;
  /** Archivieren statt löschen – die Historie bleibt erhalten. */
  archived: boolean;
  createdAt: string;
}

/**
 * Feste Doppelkopf-Runde (Tabellen `groups` + `group_members`).
 * `memberIds` enthält genau 4 Spieler-IDs.
 */
export interface Group {
  id: string;
  name: string;
  gameType: "doppelkopf";
  memberIds: string[];
}

/** Spielspezifische Einstellungen, z. B. `{ target: 200 }` bei Flip 7. */
export type MatchSettings = Record<string, unknown>;

/** Eine Partie (Tabelle `matches`). */
export interface Match {
  id: string;
  gameType: GameType;
  /** Pflicht bei Doppelkopf, sonst leer. */
  groupId?: string;
  status: MatchStatus;
  settings: MatchSettings;
  /** Konto, das die Partie angelegt hat; in Phase 2 leer. */
  createdBy?: string;
  startedAt: string;
  finishedAt?: string;
}

/**
 * Teilnehmer einer Partie (Tabelle `match_players`).
 * Genau eins von `playerId` und `guestName` ist gesetzt.
 * Die `id` dient in Runden als Schlüssel für die Punkte.
 */
export interface MatchPlayer {
  id: string;
  matchId: string;
  playerId?: string;
  /** Gast: zählt nicht für die Hall of Fame. */
  guestName?: string;
  /** Sitzreihenfolge 1…n. */
  seat: number;
  /** Gesetzt beim Abschluss. */
  finalScore?: number;
  /** Gesetzt beim Abschluss; bei Gleichstand mehrere Sieger. */
  isWinner: boolean;
}

/** Eine Runde bzw. ein einzelnes Spiel (Tabelle `rounds`). */
export interface Round {
  id: string;
  matchId: string;
  /** 1…n, eindeutig je Partie. */
  roundNo: number;
  /** Rohdaten der Eingabe – das Format bestimmt das Spiel-Modul. Die Wahrheit. */
  input: unknown;
  /** Berechnete Punkte: Teilnehmer-ID (MatchPlayer.id) → Punkte. Abgeleitet. */
  points: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** Partie mit Teilnehmern (nach Sitz sortiert) und Runden (nach Nummer sortiert). */
export interface MatchDetail {
  match: Match;
  players: MatchPlayer[];
  rounds: Round[];
}

/** Ein Teilnehmer beim Anlegen: entweder ein Spieler aus der Liste oder ein Gast. */
export type NewParticipant = { playerId: string } | { guestName: string };

/** Eingabe zum Anlegen einer Partie; die Sitze ergeben sich aus der Reihenfolge. */
export interface NewMatch {
  gameType: GameType;
  groupId?: string;
  settings: MatchSettings;
  participants: NewParticipant[];
}

/** Ergebnis beim Abschluss einer Partie (SPEC §5). */
export interface MatchResult {
  /** Teilnehmer-ID → Endstand. */
  finalScores: Record<string, number>;
  /** Teilnehmer-IDs der Sieger; bei Gleichstand mehrere. */
  winnerIds: string[];
}
