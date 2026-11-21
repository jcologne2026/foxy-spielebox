import { describe, expect, it } from "vitest";
import { initials, joinNames, signed } from "./format";

describe("format", () => {
  it("initials", () => {
    expect(initials("Fritzi Fuchs")).toBe("FF");
    expect(initials("  Lina von Libelle ")).toBe("LL");
    expect(initials("bruno")).toBe("BR");
    expect(initials("")).toBe("?");
  });

  it("signed", () => {
    expect(signed(6)).toBe("+6");
    expect(signed(-2)).toBe("−2");
    expect(signed(0)).toBe("0");
  });

  it("joinNames", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A und B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B und C");
  });
});
