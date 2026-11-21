import type { GameLogic } from "../types";

// Flip 7 nach SPEC §4.2

export interface Flip7Settings {
  target: number;
}

export interface Flip7Input {
  /** Punkte je Teilnehmer-ID; null = noch nicht eingetragen. */
  points: Record<string, number | null>;
}

export const TARGET_MIN = 50;
export const TARGET_MAX = 1000;

export const flip7: GameLogic<Flip7Input, Flip7Settings> = {
  id: "flip7",
  name: "Flip 7",
  icon: "🃏",
  color: "var(--game-flip7)",
  minPlayers: 3,
  maxPlayers: 8,
  fixedGroup: false,
  defaultSettings: { target: 200 },
  settingFields: [
    { key: "target", label: "Zielpunkte", kind: "number", min: TARGET_MIN, max: TARGET_MAX, step: 10 },
  ],

  validateSettings({ target }) {
    if (!Number.isInteger(target) || target < TARGET_MIN || target > TARGET_MAX) {
      return [`Die Zielpunkte müssen zwischen ${TARGET_MIN} und ${TARGET_MAX} liegen.`];
    }
    return [];
  },

  emptyInput(ctx) {
    return { points: Object.fromEntries(ctx.participants.map((p) => [p.id, null])) };
  },

  validateRound(input, ctx) {
    const errors: string[] = [];
    for (const p of ctx.participants) {
      const value = input.points[p.id];
      if (value === null || value === undefined) {
        errors.push(`Punkte für ${p.name} fehlen.`);
      } else if (!Number.isInteger(value) || value < 0) {
        errors.push(`Punkte für ${p.name} müssen eine ganze Zahl ab 0 sein.`);
      }
    }
    return errors;
  },

  scoreRound(input, ctx) {
    // Punkte werden 1:1 übernommen
    return Object.fromEntries(ctx.participants.map((p) => [p.id, input.points[p.id] ?? 0]));
  },

  matchStatus(totals, ctx) {
    return Object.values(totals).some((t) => t >= ctx.settings.target) ? "suggestEnd" : "running";
  },
};
