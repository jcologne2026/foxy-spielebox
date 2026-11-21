import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { ErrorList, Header, Loaded } from "../components/ui";
import { useLoad } from "../components/useLoad";
import { repository } from "../data";
import { toParticipants } from "../domain/match";
import type { MatchDetail, Participant } from "../domain/types";
import { buildRoundContext, lastRoundNo } from "../games/context";
import { getGame } from "../games/registry";
import type { AnyGameModule } from "../games/types";

/** S5 – Runde eintragen oder korrigieren. */
export function RoundScreen() {
  const { id = "", roundNo: rawRoundNo } = useParams();
  const roundNo = Number(rawRoundNo);
  const [state] = useLoad(
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
          const next = lastRoundNo(detail) + 1;
          // Nur bestehende Runden oder die nächste; beendete Partien sind schreibgeschützt
          if (!game || detail.match.status === "finished" || !Number.isInteger(roundNo) || roundNo < 1 || roundNo > next) {
            return <Navigate to={`/partie/${id}`} replace />;
          }
          return (
            <RoundEditor
              key={roundNo}
              detail={detail}
              game={game}
              participants={toParticipants(detail.players, players)}
              roundNo={roundNo}
            />
          );
        }}
      </Loaded>
    </main>
  );
}

function RoundEditor({
  detail,
  game,
  participants,
  roundNo,
}: {
  detail: MatchDetail;
  game: AnyGameModule;
  participants: Participant[];
  roundNo: number;
}) {
  const navigate = useNavigate();
  const ctx = buildRoundContext(detail, participants, roundNo, game.defaultSettings);
  const existing = detail.rounds.find((r) => r.roundNo === roundNo);
  const [value, setValue] = useState<unknown>(() => existing?.input ?? game.emptyInput(ctx));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const total = game.totalRounds?.(ctx);

  async function save() {
    // SPEC §5.2: validieren → berechnen → speichern
    const problems = game.validateRound(value, ctx);
    setErrors(problems);
    if (problems.length > 0) return;
    setSaving(true);
    try {
      const points = game.scoreRound(value, ctx);
      await repository.saveRound({ matchId: detail.match.id, roundNo, input: value, points });
      // Statusprüfung (§5.4) übernimmt der Spielstand
      navigate(`/partie/${detail.match.id}`, { replace: true });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : String(e)]);
      setSaving(false);
    }
  }

  const Form = game.RoundForm;
  return (
    <>
      <Header title={`${existing ? "Runde korrigieren" : "Runde eintragen"}`} back={`/partie/${detail.match.id}`}>
        <p className="muted subtitle">
          {game.name} · Runde {roundNo}
          {total !== undefined && ` von ${total}`}
        </p>
      </Header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Form value={value} onChange={setValue} ctx={ctx} />
        <div className="action-bar">
          <ErrorList errors={errors} />
          <button type="submit" className="button primary" disabled={saving}>
            Speichern
          </button>
        </div>
      </form>
    </>
  );
}
