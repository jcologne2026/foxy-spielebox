// Liste aller Spiel-Module (SPEC §4.1). Startseite, Historie und Hall of Fame lesen nur hier.
// Ein neues Spiel = neues Modul anlegen und hier eintragen.
import type { GameType } from "../domain/types";
import { doppelkopf } from "./doppelkopf/module";
import { DoppelkopfRoundForm } from "./doppelkopf/RoundForm";
import { flip7 } from "./flip7/module";
import { Flip7RoundForm } from "./flip7/RoundForm";
import type { AnyGameModule } from "./types";
import { wizard } from "./wizard/module";
import { WizardRoundForm } from "./wizard/RoundForm";

export const games: AnyGameModule[] = [
  { ...doppelkopf, RoundForm: DoppelkopfRoundForm },
  { ...flip7, RoundForm: Flip7RoundForm },
  { ...wizard, RoundForm: WizardRoundForm },
];

export function getGame(id: string | undefined): AnyGameModule | undefined {
  return games.find((g) => g.id === (id as GameType));
}
