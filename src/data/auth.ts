/** Konto mit Rolle (Tabelle `profiles`, SPEC §3.1). */
export interface Profile {
  /** = ID des Supabase-Kontos. */
  id: string;
  role: "admin" | "member";
  /** Verknüpfter Spieler (optional, Konto ≠ Spieler). */
  playerId?: string;
  /** E-Mail zur Anzeige in der Verwaltung. */
  email?: string;
}

export interface AuthSession {
  accountId: string;
  email?: string;
}

/**
 * Login und Konten (ab Phase 4). Im lokalen Modus gibt es kein Login:
 * `enabled` ist false und jeder ist Admin.
 */
export interface AuthService {
  enabled: boolean;
  getSession(): Promise<AuthSession | null>;
  /** Meldet An- und Abmeldungen; liefert eine Funktion zum Abbestellen. */
  onChange(callback: (session: AuthSession | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getProfile(accountId: string): Promise<Profile | null>;
  /** Nur Admin. */
  listProfiles(): Promise<Profile[]>;
  /** Nur Admin: Rolle und Spieler-Verknüpfung ändern. */
  saveProfile(profile: Pick<Profile, "id" | "role" | "playerId">): Promise<void>;
}

/** Lokaler Modus ohne Login. */
export const localAuth: AuthService = {
  enabled: false,
  getSession: async () => null,
  onChange: () => () => {},
  signIn: async () => {
    throw new Error("Im lokalen Modus gibt es kein Login.");
  },
  signOut: async () => {},
  getProfile: async () => null,
  listProfiles: async () => [],
  saveProfile: async () => {
    throw new Error("Im lokalen Modus gibt es keine Konten.");
  },
};
