// Kleine Anzeige-Hilfen (reine Funktionen, getestet in format.test.ts).

/** Initialen für den Avatar: „Fritzi Fuchs“ → „FF“, „Bruno“ → „BR“. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("de");
  return (words[0][0] + words[words.length - 1][0]).toLocaleUpperCase("de");
}

/** Datum auf Deutsch, z. B. „Sa., 21.11.2026“. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Punkte mit Vorzeichen für Rundenwerte, z. B. „+6“, „−2“, „0“. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "0";
}

/** Liste von Namen: „A“, „A und B“, „A, B und C“. */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}
