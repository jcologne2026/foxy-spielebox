// Hilfen für die Modul-Tests – nur Fantasienamen (CLAUDE.md).
import type { Participant, RoundContext } from "./types";

export const NAMES = ["Fritzi Fuchs", "Bruno Bär", "Emil Eule", "Hanna Hase", "Otto Otter", "Lina Libelle"];

/** n Teilnehmer mit den IDs "p1" … "pn". */
export function participants(n: number): Participant[] {
  return NAMES.slice(0, n).map((name, i) => ({ id: `p${i + 1}`, name }));
}

export function context<S>(n: number, settings: S, roundNo = 1): RoundContext<S> {
  return { participants: participants(n), roundNo, settings, previousRounds: [] };
}
