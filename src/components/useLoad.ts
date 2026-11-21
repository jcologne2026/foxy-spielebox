import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

/**
 * Lädt Daten asynchron (z. B. aus dem Repository) und liefert den Zustand.
 * Ändern sich die `deps` (z. B. anderes Spiel), zeigt der Zustand sofort „loading“ –
 * so erscheinen nie alte Daten unter neuer Überschrift.
 * `reload()` lädt neu und behält solange die bisherigen Daten (kein Flackern nach dem Speichern).
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): [LoadState<T>, () => void] {
  const key = JSON.stringify(deps);
  const [state, setState] = useState<{ key: string; value: LoadState<T> }>({ key, value: { status: "loading" } });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ key, value: { status: "ready", data } }),
      (e: unknown) =>
        active && setState({ key, value: { status: "error", error: e instanceof Error ? e.message : String(e) } }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Gehört der gespeicherte Zustand zu anderen deps, gilt er als „lädt noch“
  return [state.key === key ? state.value : { status: "loading" }, reload];
}
