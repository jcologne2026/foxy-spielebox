import type {
  GameType,
  Group,
  Match,
  MatchDetail,
  MatchPlayer,
  MatchResult,
  MatchStatus,
  NewMatch,
  Player,
  Round,
} from "../domain/types";

/**
 * Eingabe für savePlayer: ohne `id` = neuer Spieler, mit `id` = Änderung.
 * `createdAt` vergibt das Repository.
 */
export type PlayerInput = Omit<Player, "id" | "createdAt"> & { id?: string };

/**
 * Eingabe für saveRound: Gibt es zu `matchId` + `roundNo` schon eine Runde,
 * wird sie ersetzt (Korrektur), sonst neu angelegt.
 * `id` und Zeitstempel vergibt das Repository.
 */
export type RoundInput = Omit<Round, "id" | "createdAt" | "updatedAt">;

/** Eingabe für saveGroup: ohne `id` = neue Runde. Genau 4 Mitglieder. */
export type GroupInput = Omit<Group, "id" | "gameType"> & { id?: string };

/** Kompletter Datenbestand – für Export (Backup) und Import (Umzug). */
export interface DataSnapshot {
  players: Player[];
  groups: Group[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  rounds: Round[];
}

export interface MatchFilter {
  gameType?: GameType;
  groupId?: string;
  status?: MatchStatus;
}

/**
 * Vertrag für die Datenschicht (SPEC §2).
 * Die UI kennt nur diese Schnittstelle, nicht den Speicherort.
 * Umsetzungen: LocalRepository (Phase 2), SupabaseRepository (Phase 4).
 */
export interface Repository {
  listPlayers(opts?: { includeArchived?: boolean }): Promise<Player[]>;
  savePlayer(p: PlayerInput): Promise<Player>;
  listGroups(): Promise<Group[]>;
  /** Nur Admin: Runde anlegen oder umbenennen. */
  saveGroup(g: GroupInput): Promise<Group>;
  listMatches(filter?: MatchFilter): Promise<Match[]>;
  /** Partien samt Teilnehmern und Runden, neueste zuerst (für Start, Historie, Hall of Fame). */
  listMatchDetails(filter?: MatchFilter): Promise<MatchDetail[]>;
  /** Partie + Teilnehmer + Runden. */
  getMatch(id: string): Promise<MatchDetail>;
  createMatch(m: NewMatch): Promise<MatchDetail>;
  /** Anlegen oder korrigieren. */
  saveRound(r: RoundInput): Promise<Round>;
  finishMatch(id: string, result: MatchResult): Promise<void>;
  /** Nur Admin (Prüfung ab Phase 4). */
  deleteMatch(id: string): Promise<void>;
  /** Alle Daten als ein Objekt (Backup als JSON-Datei, SPEC §12). */
  exportAll(): Promise<DataSnapshot>;
  /** Nur Admin: übernimmt einen kompletten Bestand (Import, SPEC §12). */
  importAll(data: DataSnapshot): Promise<void>;
}
