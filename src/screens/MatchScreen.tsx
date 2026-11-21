import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { PlayerRow } from "../components/Avatar";
import { formatDate, joinNames, signed } from "../components/format";
import { useSession } from "../components/session";
import { ErrorList, Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { repository } from "../data";
import { computeResult, computeTotals, rankParticipants, toParticipants } from "../domain/match";
import type { MatchDetail, Participant } from "../domain/types";
import { buildRoundContext, describeSettings, lastRoundNo } from "../games/context";
import { getGame } from "../games/registry";
import type { AnyGameModule } from "../games/types";

/** S4 – Spielstand: Rangliste, Rundenverlauf, Runde eintragen, Partie beenden. */
export function MatchScreen() {
  const { id = "" } = useParams();
  const [state, reload] = useLoad(
    async () => ({
      detail: await repository.getMatch(id),
      players: await repository.listPlayers({ includeArchived: true }),
    }),
    [id],
  );
  return (
    <main>
      <Loaded state={state}>
        {({ detail, players }) => {
          const game = getGame(detail.match.gameType);
          if (!game) return <Navigate to="/" replace />;
          return (
            <MatchView detail={detail} game={game} participants={toParticipants(detail.players, players)} reload={reload} />
          );
        }}
      </Loaded>
    </main>
  );
}

function MatchView({
  detail,
  game,
  participants,
  reload,
}: {
  detail: MatchDetail;
  game: AnyGameModule;
  participants: Participant[];
  reload: () => void;
}) {
  const navigate = useNavigate();
  const { isAdmin } = useSession();
  const [search, setSearch] = useSearchParams();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { match, rounds } = detail;
  const finished = match.status === "finished";
  const ids = participants.map((p) => p.id);
  const totals = finished
    ? Object.fromEntries(detail.players.map((mp) => [mp.id, mp.finalScore ?? 0]))
    : computeTotals(ids, rounds);
  const ranking = rankParticipants(participants, totals);

  const last = lastRoundNo(detail);
  const ctx = buildRoundContext(detail, participants, Math.max(last, 1), game.defaultSettings);
  const total = game.totalRounds?.(ctx);
  const progress = last > 0 && !finished ? game.matchStatus(totals, { ...ctx, roundNo: last }) : "running";
  const allRoundsPlayed = total !== undefined && last >= total;
  // SPEC §5.4: bei „finished“ automatisch zum Abschluss
  const confirmOpen = !finished && (search.get("abschluss") === "1" || (progress === "finished" && !dismissed));

  const winners = new Set(finished ? detail.players.filter((mp) => mp.isWinner).map((mp) => mp.id) : []);
  const result = computeResult(totals);
  const winnerNames = participants.filter((p) => result.winnerIds.includes(p.id)).map((p) => p.name);

  async function finish() {
    setBusy(true);
    try {
      await repository.finishMatch(match.id, result);
      setSearch({}, { replace: true });
      reload();
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Diese Partie endgültig löschen?")) return;
    try {
      await repository.deleteMatch(match.id);
      navigate("/", { replace: true });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
    }
  }

  return (
    <>
      <Header title={game.name} back={finished ? "/historie" : "/"}>
        <p className="muted subtitle">
          {formatDate(match.startedAt)}
          {total !== undefined && (last > 0 ? ` · Runde ${last} von ${total}` : ` · ${total} Runden`)}
          {describeSettings(game, ctx.settings).map((s) => ` · ${s}`)}
          {finished && " · beendet"}
        </p>
      </Header>

      {finished && (
        <p className="banner success">
          🏆 {winnerNamesFrom(participants, winners)} {winners.size > 1 ? "gewinnen" : "gewinnt"}!
        </p>
      )}
      {progress === "suggestEnd" && !confirmOpen && (
        <div className="banner">
          <span>Zielwert erreicht. Partie beenden?</span>
          <button type="button" className="button small primary" onClick={() => setSearch({ abschluss: "1" })}>
            Beenden
          </button>
        </div>
      )}

      <section aria-label="Rangliste">
        <div className="card">
          {ranking.map((r) => (
            <PlayerRow
              key={r.participant.id}
              name={r.participant.name}
              photoPath={r.participant.photoPath}
              archived={r.participant.archived}
              guest={!r.participant.playerId}
              sub={`${r.rank}. Platz`}
              value={r.total}
              highlight={winners.has(r.participant.id)}
            />
          ))}
        </div>
      </section>

      {rounds.length > 0 && (
        <section>
          <h2>Verlauf</h2>
          <RoundTable detail={detail} game={game} participants={participants} editable={!finished} />
        </section>
      )}

      <ErrorList errors={errors} />

      {confirmOpen && (
        <div className="card confirm" role="dialog" aria-label="Partie abschließen">
          <h2>Partie abschließen?</h2>
          <p>
            {allRoundsPlayed && "Alle Runden sind gespielt. "}
            {winnerNames.length > 0 ? (
              <>
                Sieg für <strong>{joinNames(winnerNames)}</strong>.
              </>
            ) : (
              "Noch keine Punkte."
            )}
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setDismissed(true);
                setSearch({}, { replace: true });
              }}
              disabled={busy}
            >
              {progress === "finished" ? "Runde korrigieren" : "Weiterspielen"}
            </button>
            <button type="button" className="button primary" onClick={finish} disabled={busy}>
              Abschließen
            </button>
          </div>
        </div>
      )}

      {!finished && !confirmOpen && (
        <div className="action-bar">
          {!allRoundsPlayed && (
            <Link to={`/partie/${match.id}/runde/${last + 1}`} className="button primary">
              Runde {last + 1} eintragen
            </Link>
          )}
          <button type="button" className="button secondary" onClick={() => setSearch({ abschluss: "1" })}>
            Partie beenden
          </button>
        </div>
      )}

      {isAdmin && (
        <p className="danger-zone">
          <button type="button" className="link-button danger" onClick={remove}>
            Partie löschen
          </button>
        </p>
      )}
    </>
  );
}

function winnerNamesFrom(participants: Participant[], winners: Set<string>): string {
  return joinNames(participants.filter((p) => winners.has(p.id)).map((p) => p.name));
}

/** Rundenverlauf als Tabelle; offene Partien: Tipp auf eine Zeile öffnet die Korrektur. */
function RoundTable({
  detail,
  game,
  participants,
  editable,
}: {
  detail: MatchDetail;
  game: AnyGameModule;
  participants: Participant[];
  editable: boolean;
}) {
  const navigate = useNavigate();
  const ids = participants.map((p) => p.id);
  return (
    <div className="table-scroll">
      <table className="round-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            {participants.map((p) => (
              <th key={p.id} scope="col" title={p.name}>
                {p.name.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {detail.rounds.map((r) => {
            const ctx = buildRoundContext(detail, participants, r.roundNo, game.defaultSettings);
            const description = game.describeRound?.(r.input, ctx);
            const open = () => navigate(`/partie/${detail.match.id}/runde/${r.roundNo}`);
            return (
              <tr
                key={r.id}
                className={editable ? "clickable" : undefined}
                onClick={editable ? open : undefined}
                onKeyDown={editable ? (e) => e.key === "Enter" && open() : undefined}
                tabIndex={editable ? 0 : undefined}
                title={description ?? (editable ? "Runde korrigieren" : undefined)}
              >
                <th scope="row">{r.roundNo}</th>
                {ids.map((id) => (
                  <td key={id} className={(r.points[id] ?? 0) < 0 ? "negative" : undefined}>
                    {signed(r.points[id] ?? 0)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && <p className="muted small">Tippe auf eine Runde, um sie zu korrigieren.</p>}
    </div>
  );
}
