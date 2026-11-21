import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthService, AuthSession, Profile } from "./auth";
import type { PhotoStore } from "./photos";

const BUCKET = "player-photos";
export const OFFLINE_MESSAGE = "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
/** Gültigkeit signierter Foto-URLs in Sekunden. */
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * `photoPath` = Dateiname im Bucket plus Version, z. B. "<id>.jpg?v=1732200000000".
 * Die Version ändert sich bei jedem Upload, damit alle Geräte das neue Foto laden.
 */
export function objectKey(photoPath: string): string {
  return photoPath.split("?")[0];
}

/** Fotos im privaten Bucket; Anzeige nur über zeitlich begrenzte signierte URLs (SPEC §9). */
export class SupabasePhotoStore implements PhotoStore {
  constructor(private db: SupabaseClient) {}

  async url(photoPath: string): Promise<string | null> {
    const { data, error } = await this.db.storage.from(BUCKET).createSignedUrl(objectKey(photoPath), SIGNED_URL_SECONDS);
    return error ? null : data.signedUrl;
  }

  async upload(playerId: string, jpeg: Blob): Promise<string> {
    const path = `${playerId}.jpg`;
    const { error } = await this.db.storage.from(BUCKET).upload(path, jpeg, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Foto konnte nicht hochgeladen werden: ${error.message}`);
    return `${path}?v=${Date.now()}`;
  }

  async remove(photoPath: string): Promise<void> {
    const { error } = await this.db.storage.from(BUCKET).remove([objectKey(photoPath)]);
    if (error) throw new Error(`Foto konnte nicht entfernt werden: ${error.message}`);
  }
}

interface ProfileRow {
  id: string;
  role: "admin" | "member";
  player_id: string | null;
  email: string | null;
}

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  role: r.role,
  playerId: r.player_id ?? undefined,
  email: r.email ?? undefined,
});

/** Login mit E-Mail und Passwort; keine Selbstregistrierung (SPEC §9). */
export function supabaseAuth(db: SupabaseClient): AuthService {
  const toSession = (s: { user: { id: string; email?: string } } | null): AuthSession | null =>
    s ? { accountId: s.user.id, email: s.user.email } : null;

  return {
    enabled: true,

    async getSession() {
      const { data } = await db.auth.getSession();
      return toSession(data.session);
    },

    onChange(callback) {
      const { data } = db.auth.onAuthStateChange((_event, session) => callback(toSession(session)));
      return () => data.subscription.unsubscribe();
    },

    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (error.message.includes("Invalid login")) throw new Error("E-Mail oder Passwort ist falsch.");
        if (/fetch|network/i.test(error.message)) throw new Error(OFFLINE_MESSAGE);
        throw new Error(error.message);
      }
    },

    async signOut() {
      await db.auth.signOut();
    },

    async getProfile(accountId) {
      const { data, error } = await db.from("profiles").select("*").eq("id", accountId).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? toProfile(data as ProfileRow) : null;
    },

    async listProfiles() {
      const { data, error } = await db.from("profiles").select("*").order("email");
      if (error) throw new Error(error.message);
      return (data as ProfileRow[]).map(toProfile);
    },

    async saveProfile(profile) {
      const { data, error } = await db
        .from("profiles")
        .update({ role: profile.role, player_id: profile.playerId ?? null })
        .eq("id", profile.id)
        .select("id");
      if (error) throw new Error(error.message);
      if (!data?.length) throw new Error("Das Konto wurde nicht geändert (nur Admins dürfen Konten verwalten).");
    },
  };
}
