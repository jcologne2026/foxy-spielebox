import type React from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { Avatar } from "../components/Avatar";
import { formatDate } from "../components/format";
import { Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { repository } from "../data";
import { computeHallOfFame, formatAverage, formatWinRate, MIN_MATCHES_FOR_RATE } from "../domain/hallOfFame";
import { games, getGame } from "../games/registry";

/** S7 – Hall of Fame: Reiter pro Spiel, bei Doppelkopf Filter nach Runde. */
export function HallOfFameScreen() {
  const { gameType } = useParams();
  const game = getGame(gameType);
  const [search, setSearch] = useSearchParams();
  const groupId = search.get("runde") ?? undefined;

  const [state] = useLoad(
    async () => ({
      details: await repository.listMatchDetails({ gameType: game?.id, status: "finished" }),
      players: await repository.listPlayers({ includeArchived: true }),
      groups: await repository.listGroups(),
    }),
    [game?.id],
  );

  if (!game) return <Navigate to={`/hall-of-fame/${games[0].id}`} replace />;
  const eternal = game.id === "doppelkopf";

  return (
    <main>
      <Header title="Hall of Fame" />
      <nav className="tabs" aria-label="Spiel wählen">
        {games.map((g) => (
          <Link key={g.id} to={`/hall-of-fame/${g.id}`} className="tab" aria-current={g.id === game.id ? "page" : undefined} style={{ "--tile-color": g.color } as React.CSSProperties}>
            {g.icon} {g.name}
          </Link>
        ))}
      </nav>

      <Loaded state={state}>
        {({ details, players, groups }) => {
          const ownGroups = game.fixedGroup ? groups.filter((g) => g.gameType === game.id) : [];
          const hof = computeHallOfFame(details, players, { gameType: game.id, groupId });
          return (
            <>
              {ownGroups.length > 0 && (
                <div className="choice-row" role="group" aria-label="Ansicht">
                  <button type="button" className="chip" aria-pressed={!groupId} onClick={() => setSearch({}, { replace: true })}>
                    Gesamt
                  </button>
                  {ownGroups.map((g) => (
                    <button key={g.id} type="button" className="chip" aria-pressed={groupId === g.id} onClick={() => setSearch({ runde: g.id }, { replace: true })}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              {hof.rows.length === 0 ? (
                <p className="muted spaced">Noch keine beendete Partie {game.name}. Die erste Partie schreibt Geschichte!</p>
              ) : (
                <>
                  <div className="record-grid">
                    {hof.highestScore && (
                      <div className="record">
                        <span className="record-label">Höchste Punktzahl</span>
                        <span className="record-value">{hof.highestScore.value}</span>
                        <span>
                          {hof.highestScore.name}
                          <small>{formatDate(hof.highestScore.date)}</small>
                        </span>
                      </div>
                    )}
                    {hof.longestStreak && (
                      <div className="record">
                        <span className="record-label">Längste Siegesserie</span>
                        <span className="record-value">{hof.longestStreak.length}</span>
                        <span>
                          {hof.longestStreak.name}
                          <small>{hof.longestStreak.length === 1 ? "Sieg" : "Siege in Folge"}</small>
                        </span>
                      </div>
                    )}
                  </div>

                  <h2>{eternal ? "Ewige Tabelle" : "Siege"}</h2>
                  <ol className="card hof-list">
                    {hof.rows.map((r, i) => (
                      <li key={r.playerId} className="player-row">
                        <span className="rank">{i + 1}</span>
                        <Avatar name={r.name} photoPath={r.photoPath} />
                        <span className="player-name">
                          {r.name}
                          {r.archived && <span className="tag">archiviert</span>}
                          <small>
                            {r.matches} {r.matches === 1 ? "Partie" : "Partien"} ·{" "}
                            {eternal ? `${r.wins} ${r.wins === 1 ? "Sieg" : "Siege"}` : `${r.totalScore} Pkt.`} · Quote{" "}
                            {formatWinRate(r.winRate)} · Ø {formatAverage(r.avgScore)}
                          </small>
                        </span>
                        <span className="player-value">{eternal ? r.totalScore : r.wins}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="muted small">
                    Gäste zählen nicht. Siegquote ab {MIN_MATCHES_FOR_RATE} Partien. Gleichstand zählt als Sieg für alle.
                  </p>
                </>
              )}
            </>
          );
        }}
      </Loaded>
    </main>
  );
}
