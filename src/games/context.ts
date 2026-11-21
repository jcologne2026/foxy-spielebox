import type { MatchDetail, Participant } from "../domain/types";
import type { GameLogic, RoundContext } from "./types";

/**
 * Baut den RoundContext für ein Spiel-Modul.
 * `previousRounds` enthält alle Runden außer der mit `roundNo` (wichtig beim Korrigieren).
 */
export function buildRoundContext<S>(
  detail: MatchDetail,
  participants: Participant[],
  roundNo: number,
  defaultSettings: S,
): RoundContext<S> {
  return {
    participants,
    roundNo,
    settings: { ...defaultSettings, ...(detail.match.settings as Partial<S>) },
    previousRounds: detail.rounds.filter((r) => r.roundNo !== roundNo),
  };
}

/** Nummer der zuletzt gespielten Runde (0 = noch keine). */
export function lastRoundNo(detail: MatchDetail): number {
  return detail.rounds.reduce((max, r) => Math.max(max, r.roundNo), 0);
}

/** Einstellungen als kurze Texte für die Anzeige, z. B. ["Zielpunkte 200"]. */
export function describeSettings(game: GameLogic<unknown, unknown>, settings: unknown): string[] {
  const values = settings as Record<string, unknown>;
  return game.settingFields.flatMap((f) => {
    if (f.kind === "number") return [`${f.label} ${String(values[f.key])}`];
    return values[f.key] ? [f.label] : [];
  });
}
