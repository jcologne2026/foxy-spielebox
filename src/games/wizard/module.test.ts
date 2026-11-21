import { describe, expect, it } from "vitest";
import { context } from "../testing";
import { wizard, wizardRounds, wizardScore, type WizardInput } from "./module";

const off = { forbidExactBids: false };
const on = { forbidExactBids: true };

/** Eingabe für 3 Spieler p1–p3. */
function input(bids: number[], tricks: number[]): WizardInput {
  const ids = ["p1", "p2", "p3"];
  return {
    bids: Object.fromEntries(ids.map((id, i) => [id, bids[i]])),
    tricks: Object.fromEntries(ids.map((id, i) => [id, tricks[i]])),
  };
}

describe("Wizard", () => {
  it("T1: Ansage 2, Stiche 2 ergibt +40", () => {
    expect(wizardScore(2, 2)).toBe(40);
  });

  it("T2: Ansage 1, Stiche 3 ergibt −20", () => {
    expect(wizardScore(1, 3)).toBe(-20);
  });

  it("Ansage 0, Stiche 0 ergibt +20", () => {
    expect(wizardScore(0, 0)).toBe(20);
  });

  it("T3: Runde 3 mit Stichsumme 2 ist ungültig", () => {
    const errors = wizard.validateRound(input([1, 1, 0], [1, 1, 0]), context(3, off, 3));
    expect(errors).toEqual(["Die Summe der Stiche muss 3 sein (eingetragen: 2)."]);
  });

  it("T4: Hausregel an, Runde 3, Ansagesumme 3 ist ungültig", () => {
    const valid = input([1, 1, 1], [2, 1, 0]);
    expect(wizard.validateRound(valid, context(3, off, 3))).toEqual([]);
    expect(wizard.validateRound(valid, context(3, on, 3))).toHaveLength(1);
  });

  it("wertet eine ganze Runde", () => {
    const ctx = context(3, off, 3);
    const round = input([2, 1, 0], [2, 0, 1]);
    expect(wizard.validateRound(round, ctx)).toEqual([]);
    expect(wizard.scoreRound(round, ctx)).toEqual({ p1: 40, p2: -10, p3: -10 });
  });

  it("Werte über der Rundennummer oder fehlende Werte sind Fehler", () => {
    const ctx = context(3, off, 2);
    expect(wizard.validateRound(input([3, 0, 0], [2, 0, 0]), ctx)).toHaveLength(1);
    const missing = input([1, 0, 0], [1, 1, 0]);
    missing.bids.p2 = null;
    expect(wizard.validateRound(missing, ctx)).toEqual(["Ansage für Bruno Bär fehlt."]);
  });

  it("Rundenzahl = 60 ÷ Spielerzahl", () => {
    expect([3, 4, 5, 6].map(wizardRounds)).toEqual([20, 15, 12, 10]);
  });

  it("endet nach der letzten Runde", () => {
    expect(wizard.matchStatus({}, context(4, off, 14))).toBe("running");
    expect(wizard.matchStatus({}, context(4, off, 15))).toBe("finished");
  });
});
