import { Link } from "react-router";
import { GameTile } from "../components/GameTile";
import { formatDate, joinNames } from "../components/format";
import { Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { repository } from "../data";
import { toParticipants } from "../domain/match";
import { games, getGame } from "../games/registry";
import logoUrl from "../assets/logo.svg";

/** S2 – Start: Logo, Slogan, Spielkacheln, offene Partien. */
export function StartScreen() {
  const [state] = useLoad(
    async () => ({
      open: await repository.listMatchDetails({ status: "open" }),
      players: await repository.listPlayers({ includeArchived: true }),
    }),
    [],
  );

  return (
    <main>
      <header className="hero">
        <img src={logoUrl} alt="" className="logo" width={120} height={120} />
        <h1>Spielebox der Foxy-Bande</h1>
        <p className="slogan">Karten raus, Punkte rein!</p>
      </header>

      <section aria-label="Neue Partie">
        <div className="tile-grid">
          {games.map((g) => (
            <GameTile key={g.id} module={g} to={`/neu/${g.id}`} />
          ))}
        </div>
      </section>

      <Loaded state={state}>
        {({ open, players }) =>
          open.length > 0 && (
            <section>
              <h2>Offene Partien</h2>
              <ul className="card-list">
                {open.map((d) => {
                  const game = getGame(d.match.gameType);
                  const names = toParticipants(d.players, players).map((p) => p.name);
                  return (
                    <li key={d.match.id}>
                      <Link to={`/partie/${d.match.id}`} className="card-link">
                        <span className="dot" style={{ background: game?.color }} aria-hidden="true" />
                        <span>
                          <strong>{game?.name ?? d.match.gameType}</strong> · {formatDate(d.match.startedAt)}
                          <small>
                            {joinNames(names)} · {d.rounds.length} {d.rounds.length === 1 ? "Runde" : "Runden"}
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
            </section>
          )
        }
      </Loaded>
    </main>
  );
}
