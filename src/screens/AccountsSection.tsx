import { useSession } from "../components/session";
import { Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { auth } from "../data";
import type { Profile } from "../data/auth";
import type { Player } from "../domain/types";

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>;

/** Teil von S8: Konten – Rolle und Verknüpfung mit einem Spieler (ab Phase 4). */
export function AccountsSection({ players, run }: { players: Player[]; run: Run }) {
  if (!auth.enabled) {
    return (
      <section>
        <h2>Konten</h2>
        <p className="muted small">
          Die App läuft im lokalen Modus: Daten liegen nur in diesem Browser, ein Login gibt es nicht. Konten kommen mit der
          gemeinsamen Datenbank (Supabase, siehe README).
        </p>
      </section>
    );
  }
  return <AccountsList players={players} run={run} />;
}

function AccountsList({ players, run }: { players: Player[]; run: Run }) {
  const session = useSession();
  const [state, reload] = useLoad(() => auth.listProfiles(), []);
  const active = players.filter((p) => !p.archived);

  const save = async (profile: Profile, change: Partial<Profile>) => {
    if (await run(() => auth.saveProfile({ ...profile, ...change }), "Konto gespeichert.")) reload();
  };

  return (
    <section>
      <h2>Konten</h2>
      <p className="muted small">
        Neue Konten lädst du im Supabase-Dashboard ein (Authentication → Users → Invite user). Danach erscheinen sie hier, und du legst
        Rolle und Spieler fest.
      </p>
      <Loaded state={state}>
        {(profiles) => (
          <div className="card">
            {profiles.map((p) => (
              <div key={p.id} className="editor">
                <strong>{p.email ?? p.id}</strong>
                <div className="split">
                  <label>
                    <span className="field-label">Rolle</span>
                    <select
                      value={p.role}
                      disabled={p.id === session.accountId} // eigene Admin-Rolle nicht versehentlich entziehen
                      onChange={(e) => save(p, { role: e.target.value as Profile["role"] })}
                    >
                      <option value="member">Mitglied</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label>
                    <span className="field-label">Spieler</span>
                    <select value={p.playerId ?? ""} onChange={(e) => save(p, { playerId: e.target.value || undefined })}>
                      <option value="">– keiner –</option>
                      {active.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </Loaded>
    </section>
  );
}
