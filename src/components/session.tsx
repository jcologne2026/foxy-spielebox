import { createContext, useContext } from "react";

/** Wer gerade angemeldet ist. Ohne Login (lokaler Modus) ist jeder Admin. */
export interface Session {
  isAdmin: boolean;
  /** E-Mail des Kontos; leer im lokalen Modus. */
  email?: string;
  /** Konto-ID für `createdBy`; leer im lokalen Modus. */
  accountId?: string;
  signOut?: () => Promise<void>;
}

export const LOCAL_SESSION: Session = { isAdmin: true };

export const SessionContext = createContext<Session>(LOCAL_SESSION);

export function useSession(): Session {
  return useContext(SessionContext);
}
