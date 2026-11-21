import { createClient } from "@supabase/supabase-js";
import { localAuth, type AuthService } from "./auth";
import { LocalRepository } from "./localRepository";
import { LocalPhotoStore, type PhotoStore } from "./photos";
import type { Repository } from "./repository";
import { seedIfEmpty } from "./seed";
import { SupabaseRepository } from "./supabaseRepository";
import { SupabasePhotoStore, supabaseAuth } from "./supabaseServices";

// Zentrale Stelle, an der die Datenschicht mit der Außenwelt verbunden wird (SPEC §2).
// Die UI importiert nur `repository`, `photos` und `auth` und kennt nur deren Schnittstellen.
//
//  - Sind VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY gesetzt (.env bzw. GitHub-Secrets),
//    arbeitet die App mit Supabase: gemeinsame Daten und Login (Phase 4).
//  - Sonst lokaler Modus: Daten nur im Browser (localStorage), kein Login (Phase 2).
//
// Diese Datei greift beim Laden auf den Browser zu und wird darum nicht in Tests importiert.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let repository: Repository;
let photos: PhotoStore;
let auth: AuthService;

if (url && anonKey) {
  const db = createClient(url, anonKey);
  photos = new SupabasePhotoStore(db);
  repository = new SupabaseRepository(db, photos);
  auth = supabaseAuth(db);
} else {
  const local = new LocalRepository(window.localStorage);
  // Test-Spieler nur beim Entwickeln (`npm run dev`), nie in der veröffentlichten App
  if (import.meta.env.DEV) {
    seedIfEmpty(local);
  }
  repository = local;
  photos = new LocalPhotoStore();
  auth = localAuth;
}

export { auth, photos, repository };
