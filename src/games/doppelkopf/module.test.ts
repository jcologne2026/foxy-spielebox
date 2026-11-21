import { describe, expect, it } from "vitest";
import { context } from "../testing";
import { doppelkopf, type DoppelkopfInput } from "./module";

const ctx = context(4, {});

describe("Doppelkopf", () => {
  it("T5: Normalspiel Wert 3 – Gewinner je +3, Verlierer je −3", () => {
    const input: DoppelkopfInput = { type: "normal", winners: ["p1", "p3"], value: 3 };
    expect(doppelkopf.validateRound(input, ctx)).toEqual([]);
    expect(doppelkopf.scoreRound(input, ctx)).toEqual({ p1: 3, p2: -3, p3: 3, p4: -3 });
  });

  it("T6: Solo gewonnen Wert 2 – Solist +6, andere je −2", () => {
    const input: DoppelkopfInput = { type: "solo", soloist: "p2", soloWon: true, value: 2 };
    expect(doppelkopf.scoreRound(input, ctx)).toEqual({ p1: -2, p2: 6, p3: -2, p4: -2 });
  });

  it("T7: Solo verloren Wert 1 – Solist −3, andere je +1", () => {
    const input: DoppelkopfInput = { type: "solo", soloist: "p4", soloWon: false, value: 1 };
    expect(doppelkopf.scoreRound(input, ctx)).toEqual({ p1: 1, p2: 1, p3: 1, p4: -3 });
  });

  it("T8: jede gültige Eingabe ergibt in Summe 0", () => {
    const ids = ["p1", "p2", "p3", "p4"];
    const inputs: DoppelkopfInput[] = [];
    for (let value = 1; value <= 8; value++) {
      for (let a = 0; a < 4; a++) {
        for (let b = a + 1; b < 4; b++) inputs.push({ type: "normal", winners: [ids[a], ids[b]], value });
        for (const soloWon of [true, false]) inputs.push({ type: "solo", soloist: ids[a], soloWon, value });
      }
    }
    for (const input of inputs) {
      expect(doppelkopf.validateRound(input, ctx)).toEqual([]);
      const sum = Object.values(doppelkopf.scoreRound(input, ctx)).reduce((x, y) => x + y, 0);
      expect(sum).toBe(0);
    }
  });

  it("Spielwert unter 1 oder falsche Gewinnerzahl sind Fehler", () => {
    expect(doppelkopf.validateRound({ type: "normal", winners: ["p1", "p2"], value: 0 }, ctx)).toHaveLength(1);
    expect(doppelkopf.validateRound({ type: "normal", winners: ["p1"], value: 1 }, ctx)).toHaveLength(1);
    expect(doppelkopf.validateRound({ type: "normal", winners: ["p1", "p1"], value: 1 }, ctx)).toHaveLength(1);
    expect(doppelkopf.validateRound({ type: "solo", soloist: null, soloWon: true, value: 1 }, ctx)).toHaveLength(1);
  });

  it("endet nie automatisch", () => {
    expect(doppelkopf.matchStatus({ p1: 100 }, ctx)).toBe("running");
  });

  it("beschreibt Runden für den Verlauf", () => {
    expect(doppelkopf.describeRound?.({ type: "solo", soloist: "p2", soloWon: true, value: 2 }, ctx)).toBe(
      "Solo (2) Bruno Bär gewonnen",
    );
  });
});
