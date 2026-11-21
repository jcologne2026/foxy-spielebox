import { useEffect, useState, type ReactNode } from "react";
import { auth } from "../data";
import type { AuthSession } from "../data/auth";
import { LoginScreen } from "../screens/LoginScreen";
import { LOCAL_SESSION, SessionContext, type Session } from "./session";

/**
 * Lässt nur angemeldete Konten in die App (PRD §8: ohne Login kein Zugriff).
 * Im lokalen Modus gibt es kein Login – jeder ist Admin.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  if (!auth.enabled) {
    return <SessionContext.Provider value={LOCAL_SESSION}>{children}</SessionContext.Provider>;
  }
  return <RemoteSessionGate>{children}</RemoteSessionGate>;
}

type GateState = { status: "loading" } | { status: "anonymous" } | { status: "ready"; session: Session };

function RemoteSessionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    async function apply(s: AuthSession | null) {
      if (!s) {
        if (active) setState({ status: "anonymous" });
        return;
      }
      const profile = await auth.getProfile(s.accountId).catch(() => null);
      if (!active) return;
      setState({
        status: "ready",
        session: { isAdmin: profile?.role === "admin", email: s.email, accountId: s.accountId, signOut: () => auth.signOut() },
      });
    }
    auth.getSession().then(apply);
    const unsubscribe = auth.onChange(apply);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (state.status === "loading") {
    return (
      <main>
        <p className="muted">Lädt …</p>
      </main>
    );
  }
  if (state.status === "anonymous") return <LoginScreen />;
  return <SessionContext.Provider value={state.session}>{children}</SessionContext.Provider>;
}
