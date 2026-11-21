import { describe, expect, it } from "vitest";
import { context } from "../testing";
import { flip7 } from "./module";

const ctx = context(3, flip7.defaultSettings);

describe("Flip 7", () => {
  it("leere Eingabe hat für jeden Teilnehmer ein leeres Feld", () => {
    expect(flip7.emptyInput(ctx)).toEqual({ points: { p1: null, p2: null, p3: null } });
  });

  it("gültige Runde wird 1:1 gewertet", () => {
    const input = { points: { p1: 12, p2: 0, p3: 45 } };
    expect(flip7.validateRound(input, ctx)).toEqual([]);
    expect(flip7.scoreRound(input, ctx)).toEqual({ p1: 12, p2: 0, p3: 45 });
  });

  it("T10: Wert −5 ergibt einen Validierungsfehler", () => {
    const errors = flip7.validateRound({ points: { p1: -5, p2: 10, p3: 10 } }, ctx);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("Fritzi Fuchs");
  });

  it("fehlende Werte und Kommazahlen sind Fehler", () => {
    const errors = flip7.validateRound({ points: { p1: null, p2: 2.5, p3: 10 } }, ctx);
    expect(errors).toHaveLength(2);
  });

  it("T9: Gesamtstand 205 bei Ziel 200 schlägt das Ende vor", () => {
    expect(flip7.matchStatus({ p1: 205, p2: 120, p3: 80 }, ctx)).toBe("suggestEnd");
  });

  it("unter dem Ziel läuft die Partie weiter, genau am Ziel endet sie", () => {
    expect(flip7.matchStatus({ p1: 199, p2: 0, p3: 0 }, ctx)).toBe("running");
    expect(flip7.matchStatus({ p1: 200, p2: 0, p3: 0 }, ctx)).toBe("suggestEnd");
  });

  it("Zielpunkte sind nur zwischen 50 und 1000 erlaubt", () => {
    expect(flip7.validateSettings({ target: 200 })).toEqual([]);
    expect(flip7.validateSettings({ target: 40 })).toHaveLength(1);
    expect(flip7.validateSettings({ target: 1001 })).toHaveLength(1);
  });
});
