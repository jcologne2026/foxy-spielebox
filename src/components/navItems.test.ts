import { describe, expect, it } from "vitest";
import { getNavItems } from "./navItems";

describe("getNavItems", () => {
  it("zeigt Admins alle vier Einträge inkl. Verwaltung", () => {
    const labels = getNavItems(true).map((item) => item.label);
    expect(labels).toEqual(["Start", "Historie", "Hall of Fame", "Verwaltung"]);
  });

  it("versteckt die Verwaltung vor Mitgliedern", () => {
    const labels = getNavItems(false).map((item) => item.label);
    expect(labels).toEqual(["Start", "Historie", "Hall of Fame"]);
  });
});
