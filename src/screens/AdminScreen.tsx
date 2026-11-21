import { useRef, useState, type ReactNode } from "react";
import { Navigate } from "react-router";
import { Avatar } from "../components/Avatar";
import { cropToSquareJpeg, downloadText } from "../components/photo";
import { useSession } from "../components/session";
import { ErrorList, Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { photos, repository } from "../data";
import type { Group, Player } from "../domain/types";
import { AccountsSection } from "./AccountsSection";

/** S8 – Verwaltung (nur Admin): Spieler, Fotos, Runden, Konten, Backup. */
export function AdminScreen() {
  const { isAdmin } = useSession();
  const [state, reload] = useLoad(
    async () => ({
      players: await repository.listPlayers({ includeArchived: true }),
      groups: await repository.listGroups(),
    }),
    [],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string>();

  if (!isAdmin) return <Navigate to="/" replace />;

  /** Führt eine Aktion aus, zeigt Fehler an und lädt danach neu. */
  async function run(action: () => Promise<unknown>, success?: string) {
    setErrors([]);
    setNotice(undefined);
    try {
      await action();
      if (success) setNotice(success);
      reload();
      return true;
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
      return false;
    }
  }

  return (
    <main>
      <Header title="Verwaltung" />
      <ErrorList errors={errors} />
      {notice && (
        <p className="banner success" role="status">
          {notice}
        </p>
      )}
      <Loaded state={state}>
        {({ players, groups }) => (
          <>
            <PlayersSection players={players} run={run} />
            <GroupsSection players={players} groups={groups} run={run} />
            <AccountsSection players={players} run={run} />
            <BackupSection run={run} />
          </>
        )}
      </Loaded>
    </main>
  );
}

type Run = (action: () => Promise<unknown>, success?: string) => Promise<boolean>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

// ---------- Spieler ----------

function PlayersSection({ players, run }: { players: Player[]; run: Run }) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string>();
  const active = players.filter((p) => !p.archived);
  const archived = players.filter((p) => p.archived);

  return (
    <Section title={`Spieler (${active.length})`}>
      <form
        className="inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => repository.savePlayer({ name, archived: false }), `„${name.trim()}“ angelegt.`)) setName("");
        }}
      >
        <input type="text" placeholder="Neuer Spieler" aria-label="Name des neuen Spielers" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="button primary small" disabled={name.trim() === ""}>
          Anlegen
        </button>
      </form>

      <div className="card spaced">
        {active.map((p) =>
          editing === p.id ? (
            <PlayerEditor key={p.id} player={p} run={run} onDone={() => setEditing(undefined)} />
          ) : (
            <div key={p.id} className="player-row">
              <Avatar name={p.name} photoPath={p.photoPath} />
              <span className="player-name">{p.name}</span>
              <button type="button" className="button secondary small" onClick={() => setEditing(p.id)}>
                Bearbeiten
              </button>
            </div>
          ),
        )}
        {active.length === 0 && <p className="muted">Noch keine Spieler.</p>}
      </div>

      {archived.length > 0 && (
        <>
          <h3>Archiviert</h3>
          <div className="card">
            {archived.map((p) => (
              <div key={p.id} className="player-row">
                <Avatar name={p.name} photoPath={p.photoPath} />
                <span className="player-name muted">{p.name}</span>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => run(() => repository.savePlayer({ ...p, archived: false }), `„${p.name}“ ist wieder aktiv.`)}
                >
                  Zurückholen
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

function PlayerEditor({ player, run, onDone }: { player: Player; run: Run; onDone: () => void }) {
  const [name, setName] = useState(player.name);
  const fileInput = useRef<HTMLInputElement>(null);

  async function changePhoto(file: File) {
    await run(async () => {
      const jpeg = await cropToSquareJpeg(file);
      const photoPath = await photos.upload(player.id, jpeg);
      await repository.savePlayer({ ...player, photoPath });
    }, "Foto gespeichert.");
  }

  async function removePhoto() {
    if (!player.photoPath) return;
    const path = player.photoPath;
    await run(async () => {
      await repository.savePlayer({ ...player, photoPath: undefined });
      await photos.remove(path);
    }, "Foto entfernt.");
  }

  return (
    <div className="editor">
      <div className="player-row">
        <Avatar name={player.name} photoPath={player.photoPath} size={56} />
        <input type="text" aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="button-row">
        <button
          type="button"
          className="button primary small"
          disabled={name.trim() === "" || name.trim() === player.name}
          onClick={async () => (await run(() => repository.savePlayer({ ...player, name }), "Name geändert.")) && onDone()}
        >
          Namen speichern
        </button>
        <button type="button" className="button secondary small" onClick={() => fileInput.current?.click()}>
          {player.photoPath ? "Foto ändern" : "Foto hochladen"}
        </button>
        {player.photoPath && (
          <button type="button" className="button secondary small" onClick={removePhoto}>
            Foto entfernen
          </button>
        )}
      </div>
      <p className="muted small">Fotos nur mit Einverständnis der Person hochladen.</p>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) changePhoto(file);
          e.target.value = "";
        }}
      />
      <div className="button-row">
        <button
          type="button"
          className="link-button danger"
          onClick={async () => {
            if (window.confirm(`„${player.name}“ archivieren? Die Historie bleibt erhalten.`)) {
              if (await run(() => repository.savePlayer({ ...player, archived: true }), `„${player.name}“ archiviert.`)) onDone();
            }
          }}
        >
          Archivieren
        </button>
        <button type="button" className="link-button" onClick={onDone}>
          Fertig
        </button>
      </div>
    </div>
  );
}

// ---------- Doppelkopf-Runden ----------

function GroupsSection({ players, groups, run }: { players: Player[]; groups: Group[]; run: Run }) {
  const [editing, setEditing] = useState<string | "new">();
  const byId = new Map(players.map((p) => [p.id, p]));

  return (
    <Section title="Doppelkopf-Runden">
      <div className="card">
        {groups.map((g) =>
          editing === g.id ? (
            <GroupEditor key={g.id} group={g} players={players} run={run} onDone={() => setEditing(undefined)} />
          ) : (
            <div key={g.id} className="player-row">
              <span className="player-name">
                <strong>{g.name}</strong>
                <small>{g.memberIds.map((id) => byId.get(id)?.name ?? "?").join(", ")}</small>
              </span>
              <button type="button" className="button secondary small" onClick={() => setEditing(g.id)}>
                Bearbeiten
              </button>
            </div>
          ),
        )}
        {editing === "new" && <GroupEditor players={players} run={run} onDone={() => setEditing(undefined)} />}
        {groups.length === 0 && editing !== "new" && <p className="muted">Noch keine Runde.</p>}
      </div>
      {editing !== "new" && (
        <button type="button" className="button secondary small spaced" onClick={() => setEditing("new")}>
          Neue Runde
        </button>
      )}
    </Section>
  );
}

function GroupEditor({ group, players, run, onDone }: { group?: Group; players: Player[]; run: Run; onDone: () => void }) {
  const [name, setName] = useState(group?.name ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds ?? []);
  // Archivierte Mitglieder bleiben wählbar, damit bestehende Runden gültig bleiben
  const choices = players.filter((p) => !p.archived || memberIds.includes(p.id));
  const toggle = (id: string) =>
    setMemberIds((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.length < 4 ? [...m, id] : m));

  return (
    <div className="editor">
      <input type="text" placeholder="Name der Runde" aria-label="Name der Runde" value={name} onChange={(e) => setName(e.target.value)} />
      <p className="muted small">Genau 4 Spieler wählen ({memberIds.length} von 4):</p>
      <div className="choice-row">
        {choices.map((p) => (
          <button key={p.id} type="button" className="chip" aria-pressed={memberIds.includes(p.id)} onClick={() => toggle(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="button-row spaced">
        <button
          type="button"
          className="button primary small"
          disabled={name.trim() === "" || memberIds.length !== 4}
          onClick={async () => (await run(() => repository.saveGroup({ id: group?.id, name, memberIds }), "Runde gespeichert.")) && onDone()}
        >
          Speichern
        </button>
        <button type="button" className="button secondary small" onClick={onDone}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ---------- Backup ----------

function BackupSection({ run }: { run: Run }) {
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <Section title="Backup">
      <p className="muted small">
        Alle Daten als JSON-Datei sichern. Ein Import übernimmt die Einträge der Datei: Neue kommen dazu, Einträge mit gleicher ID
        werden überschrieben – etwa beim Umzug vom Browser-Speicher in die gemeinsame Datenbank.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button secondary small"
          onClick={() =>
            run(async () => {
              const data = await repository.exportAll();
              const day = new Date().toISOString().slice(0, 10);
              downloadText(`spielebox-backup-${day}.json`, JSON.stringify(data, null, 2));
            })
          }
        >
          Exportieren
        </button>
        <button type="button" className="button secondary small" onClick={() => fileInput.current?.click()}>
          Importieren
        </button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file || !window.confirm("Backup importieren? Bestehende Einträge mit gleicher ID werden überschrieben.")) return;
          await run(async () => {
            let data: unknown;
            try {
              data = JSON.parse(await file.text());
            } catch {
              throw new Error("Die Datei ist kein gültiges JSON.");
            }
            await repository.importAll(data as never);
          }, "Backup importiert.");
        }}
      />
    </Section>
  );
}
