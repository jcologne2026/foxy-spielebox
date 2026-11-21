import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "ready"; data: T };

/**
 * Lädt Daten asynchron (z. B. aus dem Repository) und liefert den Zustand.
 * `reload()` lädt neu, etwa nach dem Speichern.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]): [LoadState<T>, () => void] {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    load().then(
      (data) => active && setState({ status: "ready", data }),
      (e: unknown) => active && setState({ status: "error", error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return [state, reload];
}
