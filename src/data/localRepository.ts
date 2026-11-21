import type {
  Group,
  Match,
  MatchDetail,
  MatchPlayer,
  MatchResult,
  NewMatch,
  Player,
  Round,
} from "../domain/types";
import { newId, nowIso } from "./ids";
import type { KeyValueStorage } from "./memoryStorage";
import type { MatchFilter, PlayerInput, Repository, RoundInput } from "./repository";

/** Schlüssel im localStorage. „v1“ erlaubt später ein geändertes Format. */
export const STORAGE_KEY = "foxy-spielebox:v1";

/** Alles, was lokal gespeichert wird – ein JSON-Objekt. */
export interface LocalData {
  players: Player[];
  groups: Group[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  rounds: Round[];
}

export function emptyData(): LocalData {
  return { players: [], groups: [], matches: [], matchPlayers: [], rounds: [] };
}

/** Vergleich von Namen ohne Rücksicht auf Groß-/Kleinschreibung und Leerzeichen am Rand. */
function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("de") === b.trim().toLocaleLowerCase("de");
}

/**
 * Repository für Phase 2: speichert alles im Browser (localStorage).
 * Jede Methode lädt den Datenbestand, ändert ihn und schreibt ihn zurück.
 */
export class LocalRepository implements Repository {
  constructor(private storage: KeyValueStorage) {}

  // ---------- Laden und Speichern ----------

  private load(): LocalData {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) {
      return emptyData();
    }
    try {
      return JSON.parse(raw) as LocalData;
    } catch {
      // Lieber abbrechen als beschädigte Daten mit einem leeren Stand zu überschreiben.
      throw new Error("Die gespeicherten Daten sind beschädigt und konnten nicht gelesen werden.");
    }
  }

  private save(data: LocalData): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /** Ist noch gar nichts gespeichert? (Für die Test-Spieler in Schritt 5.) */
  isEmpty(): boolean {
    return this.storage.getItem(STORAGE_KEY) === null;
  }

  /** Schreibt einen kompletten Datenbestand, z. B. Test-Spieler oder später einen Import. */
  replaceAll(data: LocalData): void {
    this.save(data);
  }

  // ---------- Spieler ----------

  async listPlayers(opts?: { includeArchived?: boolean }): Promise<Player[]> {
    const { players } = this.load();
    return players
      .filter((p) => opts?.includeArchived || !p.archived)
      .sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  async savePlayer(input: PlayerInput): Promise<Player> {
    const data = this.load();
    const name = input.name.trim();
    if (name === "") {
      throw new Error("Der Spielername darf nicht leer sein.");
    }

    // Name eindeutig unter den nicht archivierten Spielern (SPEC §3)
    const clash = data.players.find(
      (p) => p.id !== input.id && !p.archived && sameName(p.name, name),
    );
    if (clash && !input.archived) {
      throw new Error(`Es gibt bereits einen Spieler „${clash.name}“.`);
    }

    if (input.id === undefined) {
      const player: Player = { ...input, id: newId(), name, createdAt: nowIso() };
      data.players.push(player);
      this.save(data);
      return player;
    }

    const index = data.players.findIndex((p) => p.id === input.id);
    if (index === -1) {
      throw new Error("Spieler nicht gefunden.");
    }
    const player: Player = { ...data.players[index], ...input, id: input.id, name };
    data.players[index] = player;
    this.save(data);
    return player;
  }

  // ---------- Doppelkopf-Runden ----------

  async listGroups(): Promise<Group[]> {
    return this.load().groups;
  }

  // ---------- Partien ----------

  async listMatches(filter?: MatchFilter): Promise<Match[]> {
    return this.load()
      .matches.filter(
        (m) =>
          (filter?.gameType === undefined || m.gameType === filter.gameType) &&
          (filter?.groupId === undefined || m.groupId === filter.groupId) &&
          (filter?.status === undefined || m.status === filter.status),
      )
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)); // neueste zuerst
  }

  async listMatchDetails(filter?: MatchFilter): Promise<MatchDetail[]> {
    const data = this.load();
    const matches = await this.listMatches(filter);
    return matches.map((m) => this.detail(data, m.id));
  }

  async getMatch(id: string): Promise<MatchDetail> {
    return this.detail(this.load(), id);
  }

  async createMatch(m: NewMatch): Promise<MatchDetail> {
    const data = this.load();

    if (m.gameType === "doppelkopf") {
      if (!data.groups.some((g) => g.id === m.groupId)) {
        throw new Error("Doppelkopf braucht eine gültige Runde.");
      }
    } else if (m.groupId !== undefined) {
      throw new Error("Nur Doppelkopf-Partien gehören zu einer Runde.");
    }

    const match: Match = {
      id: newId(),
      gameType: m.gameType,
      groupId: m.groupId,
      status: "open",
      settings: m.settings,
      createdBy: m.createdBy,
      startedAt: nowIso(),
    };

    const seenPlayerIds = new Set<string>();
    const players: MatchPlayer[] = m.participants.map((p, index) => {
      const base = { id: newId(), matchId: match.id, seat: index + 1, isWinner: false };
      const playerId = "playerId" in p ? p.playerId : undefined;
      const rawGuestName = "guestName" in p ? p.guestName : undefined;

      // Genau eins von playerId / guestName (SPEC §3)
      if ((playerId === undefined) === (rawGuestName === undefined)) {
        throw new Error(`Teilnehmer ${index + 1}: genau ein Spieler oder ein Gast angeben.`);
      }
      if (playerId !== undefined) {
        if (!data.players.some((pl) => pl.id === playerId)) {
          throw new Error(`Teilnehmer ${index + 1}: Spieler nicht gefunden.`);
        }
        if (seenPlayerIds.has(playerId)) {
          throw new Error(`Teilnehmer ${index + 1}: Spieler ist doppelt ausgewählt.`);
        }
        seenPlayerIds.add(playerId);
        return { ...base, playerId };
      }
      const guestName = (rawGuestName ?? "").trim();
      if (guestName === "") {
        throw new Error(`Teilnehmer ${index + 1}: Der Gastname darf nicht leer sein.`);
      }
      return { ...base, guestName };
    });

    data.matches.push(match);
    data.matchPlayers.push(...players);
    this.save(data);
    return this.detail(data, match.id);
  }

  async saveRound(r: RoundInput): Promise<Round> {
    const data = this.load();
    this.findMatch(data, r.matchId);

    if (!Number.isInteger(r.roundNo) || r.roundNo < 1) {
      throw new Error("Die Rundennummer muss eine ganze Zahl ab 1 sein.");
    }
    const participantIds = new Set(
      data.matchPlayers.filter((mp) => mp.matchId === r.matchId).map((mp) => mp.id),
    );
    for (const key of Object.keys(r.points)) {
      if (!participantIds.has(key)) {
        throw new Error("Punkte gehören zu einem Teilnehmer, der nicht in dieser Partie ist.");
      }
    }

    const now = nowIso();
    const index = data.rounds.findIndex(
      (x) => x.matchId === r.matchId && x.roundNo === r.roundNo,
    );
    let round: Round;
    if (index === -1) {
      round = { ...r, id: newId(), createdAt: now, updatedAt: now };
      data.rounds.push(round);
    } else {
      // Korrektur: gleiche Runde ersetzen, id und createdAt bleiben
      const old = data.rounds[index];
      round = { ...r, id: old.id, createdAt: old.createdAt, updatedAt: now };
      data.rounds[index] = round;
    }
    this.save(data);
    return round;
  }

  async finishMatch(id: string, result: MatchResult): Promise<void> {
    const data = this.load();
    const match = this.findMatch(data, id);
    const participants = data.matchPlayers.filter((mp) => mp.matchId === id);
    const participantIds = new Set(participants.map((mp) => mp.id));

    for (const mp of participants) {
      if (result.finalScores[mp.id] === undefined) {
        throw new Error("Für jeden Teilnehmer wird ein Endstand benötigt.");
      }
    }
    if (result.winnerIds.some((w) => !participantIds.has(w))) {
      throw new Error("Ein Sieger ist kein Teilnehmer dieser Partie.");
    }

    for (const mp of participants) {
      mp.finalScore = result.finalScores[mp.id];
      mp.isWinner = result.winnerIds.includes(mp.id);
    }
    match.status = "finished";
    match.finishedAt = nowIso();
    this.save(data);
  }

  async deleteMatch(id: string): Promise<void> {
    const data = this.load();
    this.findMatch(data, id);
    data.matches = data.matches.filter((m) => m.id !== id);
    data.matchPlayers = data.matchPlayers.filter((mp) => mp.matchId !== id);
    data.rounds = data.rounds.filter((r) => r.matchId !== id);
    this.save(data);
  }

  // ---------- Hilfsfunktionen ----------

  private findMatch(data: LocalData, id: string): Match {
    const match = data.matches.find((m) => m.id === id);
    if (!match) {
      throw new Error("Partie nicht gefunden.");
    }
    return match;
  }

  private detail(data: LocalData, id: string): MatchDetail {
    return {
      match: this.findMatch(data, id),
      players: data.matchPlayers
        .filter((mp) => mp.matchId === id)
        .sort((a, b) => a.seat - b.seat),
      rounds: data.rounds.filter((r) => r.matchId === id).sort((a, b) => a.roundNo - b.roundNo),
    };
  }
}
