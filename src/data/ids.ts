/** Der Teil von `crypto`, den wir brauchen – austauschbar für Tests. */
export type IdCrypto = Pick<Crypto, "getRandomValues"> & {
  randomUUID?: () => string;
};

/**
 * Erzeugt eine zufällige UUID (Version 4), z. B. "3f2b8c1e-9a4d-4e6f-8b2a-1c5d7e9f0a3b".
 *
 * `crypto.randomUUID()` gibt es nur in „sicheren“ Umgebungen (https oder localhost).
 * Beim Handy-Test über http://192.168.… fehlt sie, darum der Ersatzweg über
 * `getRandomValues`, der überall verfügbar ist.
 */
export function newId(c: IdCrypto = globalThis.crypto): string {
  if (typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  const bytes = c.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4 (zufällig)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variante nach RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** Aktuelle Zeit als ISO-Text in UTC, z. B. "2026-11-15T20:30:00.000Z". */
export function nowIso(): string {
  return new Date().toISOString();
}
