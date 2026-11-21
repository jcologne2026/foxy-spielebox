import type { GameLogic } from "../types";

// Wizard nach SPEC §4.3

export interface WizardSettings {
  /** Hausregel: Summe der Ansagen darf nicht der Rundennummer entsprechen. */
  forbidExactBids: boolean;
}

export interface WizardInput {
  /** Ansagen je Teilnehmer-ID; null = noch nicht eingetragen. */
  bids: Record<string, number | null>;
  /** Tatsächliche Stiche je Teilnehmer-ID. */
  tricks: Record<string, number | null>;
}

/** Rundenzahl: 60 Karten ÷ Spielerzahl (3: 20, 4: 15, 5: 12, 6: 10). */
export function wizardRounds(playerCount: number): number {
  return Math.floor(60 / playerCount);
}

/** Punkte für einen Spieler: Treffer 20 + 10 × Stiche, sonst −10 je Abweichung. */
export function wizardScore(bid: number, tricks: number): number {
  return bid === tricks ? 20 + 10 * tricks : -10 * Math.abs(bid - tricks);
}

function sum(values: Record<string, number | null>, ids: string[]): number {
  return ids.reduce((total, id) => total + (values[id] ?? 0), 0);
}

export const wizard: GameLogic<WizardInput, WizardSettings> = {
  id: "wizard",
  name: "Wizard",
  icon: "🧙",
  color: "var(--game-wizard)",
  minPlayers: 3,
  maxPlayers: 6,
  fixedGroup: false,
  defaultSettings: { forbidExactBids: false },
  settingFields: [
    {
      key: "forbidExactBids",
      label: "Hausregel: Ansagen ≠ Rundenzahl",
      kind: "boolean",
      hint: "Die Summe der Ansagen darf nicht genau der Rundennummer entsprechen.",
    },
  ],

  validateSettings() {
    return [];
  },

  totalRounds(ctx) {
    return wizardRounds(ctx.participants.length);
  },

  emptyInput(ctx) {
    const empty = () => Object.fromEntries(ctx.participants.map((p) => [p.id, null]));
    return { bids: empty(), tricks: empty() };
  },

  validateRound(input, ctx) {
    const { roundNo, participants, settings } = ctx;
    const errors: string[] = [];
    const total = wizardRounds(participants.length);
    if (roundNo > total) {
      errors.push(`Bei ${participants.length} Spielern gibt es nur ${total} Runden.`);
    }

    for (const p of participants) {
      for (const [field, label] of [
        ["bids", "Ansage"],
        ["tricks", "Stiche"],
      ] as const) {
        const value = input[field][p.id];
        if (value === null || value === undefined) {
          errors.push(`${label} für ${p.name} fehlt.`);
        } else if (!Number.isInteger(value) || value < 0 || value > roundNo) {
          errors.push(`${label} für ${p.name} muss zwischen 0 und ${roundNo} liegen.`);
        }
      }
    }
    if (errors.length > 0) return errors;

    const ids = participants.map((p) => p.id);
    const trickSum = sum(input.tricks, ids);
    if (trickSum !== roundNo) {
      errors.push(`Die Summe der Stiche muss ${roundNo} sein (eingetragen: ${trickSum}).`);
    }
    if (settings.forbidExactBids && sum(input.bids, ids) === roundNo) {
      errors.push(`Hausregel: Die Summe der Ansagen darf nicht ${roundNo} sein.`);
    }
    return errors;
  },

  scoreRound(input, ctx) {
    return Object.fromEntries(
      ctx.participants.map((p) => [p.id, wizardScore(input.bids[p.id] ?? 0, input.tricks[p.id] ?? 0)]),
    );
  },

  matchStatus(_totals, ctx) {
    return ctx.roundNo >= wizardRounds(ctx.participants.length) ? "finished" : "running";
  },
};
