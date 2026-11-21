import { Avatar } from "../../components/Avatar";
import { Stepper } from "../../components/ui";
import type { RoundFormProps } from "../types";
import type { DoppelkopfInput, DoppelkopfSettings } from "./module";

/** Eingabe eines Doppelkopf-Spiels: Spielart, Gewinner bzw. Solist, Spielwert. */
export function DoppelkopfRoundForm({ value, onChange, ctx }: RoundFormProps<DoppelkopfInput, DoppelkopfSettings>) {
  const setType = (type: "normal" | "solo") => {
    if (type === value.type) return;
    onChange(
      type === "normal"
        ? { type: "normal", winners: [], value: value.value }
        : { type: "solo", soloist: null, soloWon: true, value: value.value },
    );
  };

  const toggleWinner = (id: string) => {
    if (value.type !== "normal") return;
    const winners = value.winners.includes(id)
      ? value.winners.filter((w) => w !== id)
      : [...value.winners, id].slice(-2); // höchstens 2 – der älteste fällt heraus
    onChange({ ...value, winners });
  };

  const selected = (id: string) => (value.type === "normal" ? value.winners.includes(id) : value.soloist === id);

  return (
    <>
      <div className="choice-row" role="group" aria-label="Spielart">
        <button type="button" className="chip" aria-pressed={value.type === "normal"} onClick={() => setType("normal")}>
          Normalspiel
        </button>
        <button type="button" className="chip" aria-pressed={value.type === "solo"} onClick={() => setType("solo")}>
          Solo
        </button>
      </div>

      <h2>{value.type === "normal" ? "Wer hat gewonnen? (2 wählen)" : "Wer spielt das Solo?"}</h2>
      <div className="choice-list">
        {ctx.participants.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`choice${selected(p.id) ? " selected" : ""}`}
            aria-pressed={selected(p.id)}
            onClick={() => (value.type === "normal" ? toggleWinner(p.id) : onChange({ ...value, soloist: p.id }))}
          >
            <Avatar name={p.name} photoPath={p.photoPath} />
            <span className="player-name">{p.name}</span>
            {selected(p.id) && <span className="seat">✓</span>}
          </button>
        ))}
      </div>

      {value.type === "solo" && (
        <div className="choice-row spaced" role="group" aria-label="Ergebnis des Solos">
          <button type="button" className="chip" aria-pressed={value.soloWon} onClick={() => onChange({ ...value, soloWon: true })}>
            Solo gewonnen
          </button>
          <button type="button" className="chip" aria-pressed={!value.soloWon} onClick={() => onChange({ ...value, soloWon: false })}>
            Solo verloren
          </button>
        </div>
      )}

      <div className="setting-row spaced">
        <span>Spielwert</span>
        <Stepper label="Spielwert" value={value.value} min={1} max={30} onChange={(v) => onChange({ ...value, value: v })} />
      </div>
    </>
  );
}
