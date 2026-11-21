import { Avatar } from "../../components/Avatar";
import { NumberField } from "../../components/ui";
import type { RoundFormProps } from "../types";
import type { Flip7Input, Flip7Settings } from "./module";

/** Eingabe einer Flip-7-Runde: Punkte je Spieler. */
export function Flip7RoundForm({ value, onChange, ctx }: RoundFormProps<Flip7Input, Flip7Settings>) {
  return (
    <div className="form-rows">
      {ctx.participants.map((p) => (
        <label key={p.id} className="form-row">
          <Avatar name={p.name} photoPath={p.photoPath} />
          <span className="player-name">{p.name}</span>
          <NumberField
            label={`Punkte ${p.name}`}
            value={value.points[p.id] ?? null}
            onChange={(v) => onChange({ points: { ...value.points, [p.id]: v } })}
          />
        </label>
      ))}
    </div>
  );
}
