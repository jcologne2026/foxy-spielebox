/** Der Teil von `localStorage`, den das LocalRepository braucht. */
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** Speicher im Arbeitsspeicher – Ersatz für `localStorage` in Tests. */
export class MemoryStorage implements KeyValueStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}
