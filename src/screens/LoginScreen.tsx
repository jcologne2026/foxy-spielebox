import { useState } from "react";
import { Navigate } from "react-router";
import logoUrl from "../assets/logo.svg";
import { ErrorList } from "../components/ui";
import { auth } from "../data";

/** S1 – Login mit E-Mail und Passwort, keine Registrierung (Konten nur per Einladung). */
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Im lokalen Modus gibt es kein Login
  if (!auth.enabled) return <Navigate to="/" replace />;

  return (
    <main className="login">
      <header className="hero">
        <img src={logoUrl} alt="" className="logo" width={120} height={120} />
        <h1>Spielebox der Foxy-Bande</h1>
        <p className="slogan">Karten raus, Punkte rein!</p>
      </header>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErrors([]);
          try {
            await auth.signIn(email, password);
            // Die Anmeldung meldet sich über auth.onChange – SessionGate zeigt dann die App
          } catch (err) {
            setErrors([err instanceof Error ? err.message : String(err)]);
            setBusy(false);
          }
        }}
      >
        <label>
          <span className="field-label">E-Mail</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          <span className="field-label">Passwort</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorList errors={errors} />
        <button type="submit" className="button primary" disabled={busy}>
          Anmelden
        </button>
        <p className="muted small">Konten gibt es nur auf Einladung des Admins.</p>
      </form>
    </main>
  );
}
