import type { GameLogic, RoundContext } from "../types";

// Doppelkopf nach SPEC §4.4

export type DoppelkopfSettings = Record<string, never>;

export type DoppelkopfInput =
  | { type: "normal"; winners: string[]; value: number | null }
  | { type: "solo"; soloist: string | null; soloWon: boolean; value: number | null };

function nameOf(id: string | null, ctx: RoundContext<DoppelkopfSettings>): string {
  return ctx.participants.find((p) => p.id === id)?.name ?? "?";
}

export const doppelkopf: GameLogic<DoppelkopfInput, DoppelkopfSettings> = {
  id: "doppelkopf",
  name: "Doppelkopf",
  icon: "👑",
  color: "var(--game-doppelkopf)",
  minPlayers: 4,
  maxPlayers: 4,
  fixedGroup: true,
  defaultSettings: {},
  settingFields: [],

  validateSettings() {
    return [];
  },

  emptyInput() {
    return { type: "normal", winners: [], value: 1 };
  },

  validateRound(input, ctx) {
    const errors: string[] = [];
    const ids = new Set(ctx.participants.map((p) => p.id));
    if (input.value === null || !Number.isInteger(input.value) || input.value < 1) {
      errors.push("Der Spielwert muss eine ganze Zahl ab 1 sein.");
    }
    if (input.type === "normal") {
      const winners = new Set(input.winners);
      if (winners.size !== 2 || input.winners.length !== 2 || ![...winners].every((w) => ids.has(w))) {
        errors.push("Beim Normalspiel genau 2 Gewinner wählen.");
      }
    } else if (input.soloist === null || !ids.has(input.soloist)) {
      errors.push("Beim Solo den Solisten wählen.");
    }
    return errors;
  },

  scoreRound(input, ctx) {
    const value = input.value ?? 0;
    const points: Record<string, number> = {};
    for (const p of ctx.participants) {
      if (input.type === "normal") {
        points[p.id] = input.winners.includes(p.id) ? value : -value;
      } else {
        const sign = input.soloWon ? 1 : -1;
        points[p.id] = p.id === input.soloist ? sign * 3 * value : -sign * value;
      }
    }
    // Invariante: Summe aller Punkte einer Runde = 0
    const total = Object.values(points).reduce((a, b) => a + b, 0);
    if (total !== 0) {
      throw new Error("Interner Fehler: Die Punkte einer Doppelkopf-Runde ergeben nicht 0.");
    }
    return points;
  },

  matchStatus() {
    // Abschluss nur manuell
    return "running";
  },

  describeRound(input, ctx) {
    if (input.type === "normal") {
      return `Normalspiel (${input.value}): ${input.winners.map((w) => nameOf(w, ctx)).join(" und ")} gewinnen`;
    }
    return `Solo (${input.value}) ${nameOf(input.soloist, ctx)} ${input.soloWon ? "gewonnen" : "verloren"}`;
  },
};
