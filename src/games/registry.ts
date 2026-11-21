// Liste aller Spiel-Module (SPEC §4.1). Startseite, Historie und Hall of Fame lesen nur hier.
// Ein neues Spiel = neues Modul anlegen und hier eintragen.
import type { GameType } from "../domain/types";
import { flip7 } from "./flip7/module";
import { Flip7RoundForm } from "./flip7/RoundForm";
import type { AnyGameModule } from "./types";

export const games: AnyGameModule[] = [{ ...flip7, RoundForm: Flip7RoundForm }];

export function getGame(id: string | undefined): AnyGameModule | undefined {
  return games.find((g) => g.id === (id as GameType));
}
