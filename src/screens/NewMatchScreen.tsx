import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { ErrorList, Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { useSession } from "../components/session";
import { repository } from "../data";
import type { Group, NewParticipant, Player } from "../domain/types";
import { getGame } from "../games/registry";
import type { AnyGameModule, SettingField } from "../games/types";

/** Ausgewählter Teilnehmer in Sitzreihenfolge. */
type Pick = { kind: "player"; player: Player } | { kind: "guest"; name: string };

/** S3 – Neue Partie: Teilnehmer bzw. Runde, Gäste, Einstellungen. */
export function NewMatchScreen() {
  const { gameType } = useParams();
  const game = getGame(gameType);
  if (!game) return <Navigate to="/" replace />;
  return <NewMatchForm key={game.id} game={game} />;
}

function NewMatchForm({ game }: { game: AnyGameModule }) {
  const navigate = useNavigate();
  const session = useSession();
  const [state] = useLoad(
    async () => ({ players: await repository.listPlayers(), groups: await repository.listGroups() }),
    [],
  );
  const [picks, setPicks] = useState<Pick[]>([]);
  const [groupId, setGroupId] = useState<string>();
  const [guestName, setGuestName] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>(game.defaultSettings);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const togglePlayer = (player: Player) =>
    setPicks((current) =>
      current.some((p) => p.kind === "player" && p.player.id === player.id)
        ? current.filter((p) => !(p.kind === "player" && p.player.id === player.id))
        : [...current, { kind: "player", player }],
    );

  const addGuest = () => {
    const name = guestName.trim();
    if (name === "") return;
    setPicks((current) => [...current, { kind: "guest", name }]);
    setGuestName("");
  };

  async function start(groups: Group[]) {
    const problems: string[] = [...game.validateSettings(settings)];
    let participants: NewParticipant[];
    if (game.fixedGroup) {
      const group = groups.find((g) => g.id === groupId);
      if (!group) problems.push("Bitte eine Runde wählen.");
      participants = (group?.memberIds ?? []).map((playerId) => ({ playerId }));
    } else {
      participants = picks.map((p) => (p.kind === "player" ? { playerId: p.player.id } : { guestName: p.name }));
      if (participants.length < game.minPlayers || participants.length > game.maxPlayers) {
        problems.push(`${game.name} braucht ${game.minPlayers} bis ${game.maxPlayers} Spieler.`);
      }
    }
    setErrors(problems);
    if (problems.length > 0) return;

    setSaving(true);
    try {
      const detail = await repository.createMatch({
        gameType: game.id,
        groupId: game.fixedGroup ? groupId : undefined,
        settings,
        participants,
        createdBy: session.accountId,
      });
      navigate(`/partie/${detail.match.id}`, { replace: true });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
      setSaving(false);
    }
  }

  return (
    <main>
      <Header title={`Neue Partie ${game.name}`} back="/" />
      <Loaded state={state}>
        {({ players, groups }) => {
          const ownGroups = groups.filter((g) => g.gameType === game.id);
          const playerById = new Map(players.map((p) => [p.id, p]));
          return (
            <>
              {game.fixedGroup ? (
                <section>
                  <h2>Runde wählen</h2>
                  {ownGroups.length === 0 && (
                    <p className="muted">Es gibt noch keine Runde. Lege sie in der Verwaltung an.</p>
                  )}
                  <div className="choice-list">
                    {ownGroups.map((g) => (
                      <label key={g.id} className={`choice${groupId === g.id ? " selected" : ""}`}>
                        <input type="radio" name="group" checked={groupId === g.id} onChange={() => setGroupId(g.id)} />
                        <span>
                          <strong>{g.name}</strong>
                          <small>
                            {g.memberIds.map((id) => playerById.get(id)?.name ?? "?").join(", ")}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              ) : (
                <section>
                  <h2>
                    Spieler wählen{" "}
                    <span className="muted">
                      ({picks.length} von {game.minPlayers}–{game.maxPlayers})
                    </span>
                  </h2>
                  <p className="muted small">Die Reihenfolge des Antippens ist die Sitzreihenfolge.</p>
                  <div className="choice-list">
                    {players.map((p) => {
                      const seat = picks.findIndex((x) => x.kind === "player" && x.player.id === p.id) + 1;
                      return (
                        <label key={p.id} className={`choice${seat > 0 ? " selected" : ""}`}>
                          <input type="checkbox" checked={seat > 0} onChange={() => togglePlayer(p)} />
                          <Avatar name={p.name} photoPath={p.photoPath} />
                          <span className="player-name">{p.name}</span>
                          {seat > 0 && <span className="seat">{seat}</span>}
                        </label>
                      );
                    })}
                  </div>

                  <h3>Gäste</h3>
                  {picks.map((p, i) =>
                    p.kind === "guest" ? (
                      <div key={`g${i}`} className="choice selected">
                        <Avatar name={p.name} />
                        <span className="player-name">
                          {p.name} <span className="tag">Gast</span>
                        </span>
                        <span className="seat">{i + 1}</span>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`${p.name} entfernen`}
                          onClick={() => setPicks((c) => c.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      </div>
                    ) : null,
                  )}
                  <form
                    className="inline-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addGuest();
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Name des Gasts"
                      aria-label="Name des Gasts"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                    />
                    <button type="submit" className="button secondary" disabled={guestName.trim() === ""}>
                      Hinzufügen
                    </button>
                  </form>
                </section>
              )}

              {game.settingFields.length > 0 && (
                <section>
                  <h2>Einstellungen</h2>
                  {game.settingFields.map((f) => (
                    <SettingInput
                      key={f.key}
                      field={f}
                      value={settings[f.key]}
                      onChange={(v) => setSettings((s) => ({ ...s, [f.key]: v }))}
                    />
                  ))}
                </section>
              )}

              <div className="action-bar">
                <ErrorList errors={errors} />
                <button type="button" className="button primary" disabled={saving} onClick={() => start(groups)}>
                  Partie starten
                </button>
              </div>
            </>
          );
        }}
      </Loaded>
    </main>
  );
}

function SettingInput({ field, value, onChange }: { field: SettingField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.kind === "boolean") {
    return (
      <label className="switch-row">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {field.label}
          {field.hint && <small>{field.hint}</small>}
        </span>
      </label>
    );
  }
  return (
    <label className="setting-row">
      <span>{field.label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={typeof value === "number" && !Number.isNaN(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      />
    </label>
  );
}
