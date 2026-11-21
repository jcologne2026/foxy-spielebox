import { Avatar } from "../../components/Avatar";
import { Stepper } from "../../components/ui";
import type { RoundFormProps } from "../types";
import type { WizardInput, WizardSettings } from "./module";

/** Eingabe einer Wizard-Runde: Ansage und Stiche je Spieler. */
export function WizardRoundForm({ value, onChange, ctx }: RoundFormProps<WizardInput, WizardSettings>) {
  const { roundNo, participants, settings } = ctx;
  const sum = (field: "bids" | "tricks") => participants.reduce((t, p) => t + (value[field][p.id] ?? 0), 0);
  const bidSum = sum("bids");
  const trickSum = sum("tricks");
  const set = (field: "bids" | "tricks", id: string, v: number) =>
    onChange({ ...value, [field]: { ...value[field], [id]: v } });

  return (
    <>
      <p className="muted small">
        {roundNo} {roundNo === 1 ? "Karte" : "Karten"} pro Spieler. Ansagen vor dem Spiel, Stiche danach eintragen.
      </p>
      <div className="form-rows">
        {participants.map((p) => (
          <div key={p.id} className="form-block">
            <div className="form-row-head">
              <Avatar name={p.name} photoPath={p.photoPath} size={32} />
              <span className="player-name">{p.name}</span>
            </div>
            <div className="split">
              <div>
                <span className="field-label">Ansage</span>
                <Stepper label={`Ansage ${p.name}`} value={value.bids[p.id] ?? null} min={0} max={roundNo} onChange={(v) => set("bids", p.id, v)} />
              </div>
              <div>
                <span className="field-label">Stiche</span>
                <Stepper label={`Stiche ${p.name}`} value={value.tricks[p.id] ?? null} min={0} max={roundNo} onChange={(v) => set("tricks", p.id, v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="sum-line">
        <span className={settings.forbidExactBids && bidSum === roundNo ? "danger" : undefined}>
          Ansagen: {bidSum} {settings.forbidExactBids && `(nicht ${roundNo})`}
        </span>
        <span className={trickSum === roundNo ? "ok" : "danger"}>
          Stiche: {trickSum} von {roundNo}
        </span>
      </p>
    </>
  );
}
