import { LocalRepository } from "./localRepository";
import type { Repository } from "./repository";
import { seedIfEmpty } from "./seed";

// Zentrale Stelle, an der die Datenschicht mit dem Browser verbunden wird (SPEC §2).
// Die UI importiert nur `repository` und kennt nur die Schnittstelle `Repository` –
// in Phase 4 wird hier LocalRepository gegen SupabaseRepository getauscht.
//
// Diese Datei greift beim Laden auf `localStorage` zu und wird darum nicht in
// Tests importiert; Tests bauen sich ihr Repository mit MemoryStorage selbst.

const local = new LocalRepository(window.localStorage);

// Test-Spieler nur beim Entwickeln (`npm run dev`), nie in der veröffentlichten App
if (import.meta.env.DEV) {
  seedIfEmpty(local);
}

export const repository: Repository = local;
