# CLAUDE.md – Spielebox der Foxy-Bande

## Projektzweck
Web-App, mit der die Foxy-Bande ihre Kartenspiele (Doppelkopf, Flip 7, Wizard) digital aufschreibt: Die App rechnet die Punkte, speichert jede Partie und zeigt eine Hall of Fame.
Zugleich ist das Projekt ein Lernprojekt für Spec-Driven Development von der Anforderung bis zum Code.

**Quelle der Wahrheit:** [PRD.md](PRD.md) (Was und Warum) und [SPEC.md](SPEC.md) (Wie). Bei Widersprüchen gilt die PRD; die SPEC wird dann angepasst. Vor jeder Umsetzung den passenden Abschnitt lesen.

## Befehle
```bash
npm run dev     # Entwicklungsserver starten (mit -- --host fürs Handy im WLAN)
npm test        # Vitest-Tests einmal ausführen
npm run build   # TypeScript prüfen und Produktions-Build erzeugen
```

## Regeln
- **Keine echten Personennamen, Fotos oder Schlüssel im Repository.** Test- und Beispieldaten nur mit Fantasienamen. `.env` wird nie committet.
- **Spiel-Logik als reine Funktionen** (in `src/games/` und `src/domain/`, ohne React und ohne Datenbank), jeweils mit **Vitest-Tests**. Pflicht-Testfälle aus SPEC §4.5 und §6.
- Schichtrichtung **UI → Logik → Daten** (SPEC §2); keine Schicht greift nach oben.
- **Vor jedem Commit:** `npm run build` und `npm test` müssen grün sein.
- **Kleine Schritte:** ein Inkrement aus SPEC §13 nach dem anderen, kleine, nachvollziehbare Commits.

## Zusammenarbeit
Der Projektinhaber lernt programmieren: **Jeden Schritt kurz auf Deutsch erklären** – was gemacht wird und warum.
