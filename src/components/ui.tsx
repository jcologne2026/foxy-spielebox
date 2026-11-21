import type { ReactNode } from "react";
import { Link } from "react-router";
import type { LoadState } from "./useLoad";

/** Liste von Fehlermeldungen (SPEC §7 „ErrorList“). */
export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="error-list" role="alert">
      {errors.map((e) => (
        <li key={e}>{e}</li>
      ))}
    </ul>
  );
}

/** Zeigt Laden/Fehler an oder rendert den Inhalt, sobald die Daten da sind. */
export function Loaded<T>({ state, children }: { state: LoadState<T>; children: (data: T) => ReactNode }) {
  if (state.status === "loading") return <p className="muted">Lädt …</p>;
  if (state.status === "error") return <ErrorList errors={[state.error]} />;
  return <>{children(state.data)}</>;
}

/** Kopfzeile mit optionalem Zurück-Link. */
export function Header({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  return (
    <header className="screen-header">
      {back && (
        <Link to={back} className="back-link" aria-label="Zurück">
          ‹
        </Link>
      )}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

/** Ganzzahl-Eingabe mit Handy-Zifferntastatur; leer = null. */
export function NumberField({
  value,
  onChange,
  label,
  id,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      className="number-field"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        onChange(raw === "" ? null : Number(raw));
      }}
      onFocus={(e) => e.target.select()}
    />
  );
}

/** Zähler mit − und + (große Tasten fürs Handy); leer = null. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  const current = value ?? min;
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, current - 1))} disabled={value !== null && current <= min} aria-label={`${label} verringern`}>
        −
      </button>
      <output className={value === null ? "empty" : undefined}>{value ?? "–"}</output>
      <button
        type="button"
        onClick={() => onChange(value === null ? min : Math.min(max, current + 1))}
        disabled={value !== null && current >= max}
        aria-label={`${label} erhöhen`}
      >
        +
      </button>
    </div>
  );
}
