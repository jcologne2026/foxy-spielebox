import { describe, expect, it } from "vitest";
import { newId, nowIso, type IdCrypto } from "./ids";

// Aufbau einer UUID v4: 8-4-4-4-12 Hex-Zeichen, an Stelle 13 eine „4“,
// an Stelle 17 eines von 8, 9, a, b.
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Simuliert einen Browser ohne randomUUID (z. B. Handy über http). */
const cryptoWithoutRandomUUID: IdCrypto = {
  getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto),
};

describe("newId", () => {
  it("liefert eine UUID v4", () => {
    expect(newId()).toMatch(UUID_V4);
  });

  it("liefert auch ohne randomUUID eine gültige UUID v4", () => {
    for (let i = 0; i < 100; i++) {
      expect(newId(cryptoWithoutRandomUUID)).toMatch(UUID_V4);
    }
  });

  it("erzeugt keine doppelten IDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(newId());
      ids.add(newId(cryptoWithoutRandomUUID));
    }
    expect(ids.size).toBe(2000);
  });
});

describe("nowIso", () => {
  it("liefert einen ISO-Zeitstempel in UTC", () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
