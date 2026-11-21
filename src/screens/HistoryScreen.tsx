import { Link, useSearchParams } from "react-router";
import { formatDate, joinNames } from "../components/format";
import { Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { repository } from "../data";
import { toParticipants } from "../domain/match";
import type { GameType } from "../domain/types";
import { games, getGame } from "../games/registry";

/** S6 – Historie: alle Partien, Filter nach Spiel (und Runde), Sieger. */
export function HistoryScreen() {
  const [search, setSearch] = useSearchParams();
  const game = getGame(search.get("spiel") ?? undefined);
  const groupId = search.get("runde") ?? undefined;

  const [state] = useLoad(
    async () => ({
      details: await repository.listMatchDetails({ gameType: game?.id as GameType | undefined, groupId }),
      players: await repository.listPlayers({ includeArchived: true }),
      groups: await repository.listGroups(),
    }),
    [game?.id, groupId],
  );

  return (
    <main>
      <Header title="Historie" />
      <div className="choice-row" role="group" aria-label="Spiel filtern">
        <button type="button" className="chip" aria-pressed={!game} onClick={() => setSearch({}, { replace: true })}>
          Alle
        </button>
        {games.map((g) => (
          <button key={g.id} type="button" className="chip" aria-pressed={game?.id === g.id} onClick={() => setSearch({ spiel: g.id }, { replace: true })}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      <Loaded state={state}>
        {({ details, players, groups }) => {
          const ownGroups = game?.fixedGroup ? groups.filter((g) => g.gameType === game.id) : [];
          const groupName = new Map(groups.map((g) => [g.id, g.name]));
          return (
            <>
              {ownGroups.length > 0 && game && (
                <div className="choice-row spaced" role="group" aria-label="Runde filtern">
                  <button type="button" className="chip" aria-pressed={!groupId} onClick={() => setSearch({ spiel: game.id }, { replace: true })}>
                    Alle Runden
                  </button>
                  {ownGroups.map((g) => (
                    <button key={g.id} type="button" className="chip" aria-pressed={groupId === g.id} onClick={() => setSearch({ spiel: game.id, runde: g.id }, { replace: true })}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              {details.length === 0 ? (
                <p className="muted spaced">Noch keine Partien.</p>
              ) : (
                <ul className="card-list spaced">
                  {details.map((d) => {
                    const g = getGame(d.match.gameType);
                    const participants = toParticipants(d.players, players);
                    const winnerIds = new Set(d.players.filter((mp) => mp.isWinner).map((mp) => mp.id));
                    const winners = participants.filter((p) => winnerIds.has(p.id)).map((p) => p.name);
                    const finished = d.match.status === "finished";
                    return (
                      <li key={d.match.id}>
                        <Link to={`/partie/${d.match.id}`} className="card-link">
                          <span className="dot" style={{ background: g?.color }} aria-hidden="true" />
                          <span>
                            <strong>{g?.name ?? d.match.gameType}</strong>
                            {d.match.groupId && ` · ${groupName.get(d.match.groupId) ?? ""}`} ·{" "}
                            {formatDate(d.match.finishedAt ?? d.match.startedAt)}
                            <small>
                              {finished ? `🏆 ${joinNames(winners)}` : "läuft noch"} · {participants.map((p) => p.name).join(", ")}
                            </small>
                          </span>
                          <span className="chevron" aria-hidden="true">
                            ›
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          );
        }}
      </Loaded>
    </main>
  );
}
