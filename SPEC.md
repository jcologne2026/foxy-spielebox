# SPEC – Spielebox der Foxy-Bande

> **Version:** 1.1 · **Stand:** 21.11.2026 · **Grundlage:** PRD.md v1.2
> **Änderungen in 1.1:** Ergänzungen aus der Umsetzung, jeweils mit „(1.1)“ markiert.
> Die PRD beschreibt das **Was und Warum**, diese SPEC das **Wie**. Bei Widersprüchen gilt die PRD; die SPEC wird dann angepasst.

---

## 1. Technik-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache | **TypeScript** | Typen machen den Spiel-Modul-Vertrag prüfbar und fangen Fehler früh ab |
| UI | **React** | Verbreiteter Standard, Basis für die spätere App (Expo/React Native) |
| Build | **Vite** | Schnelle Entwicklung, einfache Konfiguration |
| Routing | **React Router mit HashRouter** (`#/…`) | GitHub Pages kennt keine Weiterleitung für Single-Page-Apps; Hash-URLs vermeiden 404-Fehler |
| Styling | **Eigenes CSS mit CSS-Variablen** | Kein zusätzliches Framework, Hell-/Dunkelmodus über Variablen |
| Tests | **Vitest** | Gleiche Konfiguration wie Vite, Akzeptanzkriterien als Tests |
| Daten Phase 2 | **localStorage** im Browser | Kein Backend nötig für den ersten Durchstich |
| Daten ab Phase 4 | **Supabase** (Postgres, Auth, Storage) | Gemeinsame Daten, Login, Zugriffsregeln in der Datenbank |
| Hosting | **GitHub Pages** | Kostenlos, Veröffentlichung per GitHub Actions bei jedem Push |

---

## 2. Architektur

Drei Schichten mit klarer Richtung: **UI → Logik → Daten.** Keine Schicht greift „nach oben“.

| Schicht | Inhalt | Regel |
|---|---|---|
| **UI** (`screens/`, `components/`) | Bildschirme, Eingabemasken, Darstellung | Rechnet nichts selbst, ruft Spiel-Module und Repository auf |
| **Logik** (`games/`, `domain/`) | Spiel-Module, Partie-Abschluss, Hall-of-Fame-Berechnung | **Reine Funktionen**: kein React, keine Datenbank, vollständig testbar |
| **Daten** (`data/`) | Repository-Schnittstelle mit zwei Implementierungen | UI kennt nur die Schnittstelle, nicht den Speicherort |

**Repository-Muster:** `LocalRepository` (Phase 2) und `SupabaseRepository` (Phase 4) erfüllen dieselbe Schnittstelle. Der Umzug zu Supabase tauscht nur die Implementierung, UI und Logik bleiben unverändert.

```ts
interface Repository {
  listPlayers(opts?: { includeArchived?: boolean }): Promise<Player[]>;
  savePlayer(p: PlayerInput): Promise<Player>;         // ohne id = neu, mit id = ändern
  listGroups(): Promise<Group[]>;
  saveGroup(g: GroupInput): Promise<Group>;            // (1.1) Runde anlegen/umbenennen, nur Admin
  listMatches(filter?: { gameType?: GameType; groupId?: string; status?: MatchStatus }): Promise<Match[]>;
  listMatchDetails(filter?: MatchFilter): Promise<MatchDetail[]>; // (1.1) für Start, Historie, Hall of Fame
  getMatch(id: string): Promise<MatchDetail>;          // Partie + Teilnehmer + Runden
  createMatch(m: NewMatch): Promise<MatchDetail>;
  saveRound(r: RoundInput): Promise<Round>;            // anlegen oder korrigieren (gleiche roundNo ersetzt)
  finishMatch(id: string, result: MatchResult): Promise<void>;
  deleteMatch(id: string): Promise<void>;              // nur Admin
  exportAll(): Promise<DataSnapshot>;                  // (1.1) Backup als JSON (§12)
  importAll(data: DataSnapshot): Promise<void>;        // (1.1) Import, gleiche ID wird überschrieben
}
```

`PlayerInput` und `RoundInput` sind die Typen ohne die Felder, die das Repository selbst vergibt (`id`, Zeitstempel); Details in `src/data/repository.ts`.

**(1.1)** `listMatchDetails` liefert Partien samt Teilnehmern in einer Abfrage, statt `getMatch` je Partie aufzurufen. Neben dem Repository gibt es zwei weitere Schnittstellen in `src/data/`: `PhotoStore` (Fotos speichern und anzeigen) und `AuthService` (Login, Konten). `src/data/index.ts` wählt die Umsetzung: Supabase, wenn `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` gesetzt sind, sonst lokal.

---

## 3. Datenmodell

Gleiche Struktur lokal (TypeScript-Typen) und in Supabase (Tabellen). Schlüssel sind UUIDs, Zeitstempel in UTC.

### 3.1 Tabellen

**`profiles`** – Konten (ab Phase 4)
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | = Supabase-Auth-User-ID |
| `role` | text | `admin` oder `member` |
| `player_id` | uuid, FK → players, optional | Verknüpfung Konto ↔ Spieler |
| `email` | text | (1.1) Anzeige in der Verwaltung, vom Trigger beim Anlegen des Kontos gesetzt |

**`players`** – zentrale Spielerliste
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text | Pflicht, eindeutig unter nicht archivierten Spielern |
| `photo_path` | text, optional | Pfad im Storage-Bucket `player-photos`; (1.1) mit Versions-Anhang `?v=<Zeitstempel>`, damit alle Geräte ein geändertes Foto neu laden |
| `archived` | boolean | Standard `false`; archivieren statt löschen |
| `created_at` | timestamptz | |

**`groups`** – feste Doppelkopf-Runden
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | |
| `name` | text | Anzeigename, vom Admin änderbar (echte Namen nur in der DB) |
| `game_type` | text | `doppelkopf` |

**`group_members`**
| Feld | Typ | Regel |
|---|---|---|
| `group_id` | uuid, FK → groups | PK zusammen mit `player_id` |
| `player_id` | uuid, FK → players | genau 4 Mitglieder je Runde |
| `position` | int | (1.1) Reihenfolge = Sitzreihenfolge in neuen Partien |

**`matches`** – Partien
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | |
| `game_type` | text | `flip7`, `wizard`, `doppelkopf` |
| `group_id` | uuid, FK → groups, optional | Pflicht bei Doppelkopf, sonst leer |
| `status` | text | `open` oder `finished` |
| `settings` | jsonb | spielspezifisch, z. B. `{ "target": 200 }` |
| `created_by` | uuid, FK → profiles | in Phase 2 leer |
| `started_at` | timestamptz | |
| `finished_at` | timestamptz, optional | gesetzt beim Abschluss |

**`match_players`** – Teilnehmer einer Partie
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | wird in Runden als Teilnehmer-Schlüssel verwendet |
| `match_id` | uuid, FK → matches | |
| `player_id` | uuid, FK → players, optional | **genau eins** von `player_id` / `guest_name` ist gesetzt |
| `guest_name` | text, optional | Gast; zählt nicht für die Hall of Fame |
| `seat` | int | Sitzreihenfolge, 1…n |
| `final_score` | int, optional | gesetzt beim Abschluss |
| `is_winner` | boolean | gesetzt beim Abschluss; bei Gleichstand mehrere |

**`rounds`** – Runden bzw. einzelne Spiele
| Feld | Typ | Regel |
|---|---|---|
| `id` | uuid, PK | |
| `match_id` | uuid, FK → matches | |
| `round_no` | int | 1…n, eindeutig je Partie |
| `input` | jsonb | Rohdaten der Eingabe, Format definiert das Spiel-Modul |
| `points` | jsonb | berechnete Punkte, `{ "<match_player_id>": int }` |
| `created_at`, `updated_at` | timestamptz | |

### 3.2 Grundsätze
- **`input` ist die Wahrheit.** `points`, `final_score` und `is_winner` sind abgeleitet und werden nach jeder Korrektur neu berechnet.
- **Hall of Fame hat keine eigene Tabelle.** Sie wird aus beendeten Partien berechnet (siehe §6).
- Löschen eines Spielers ist nicht vorgesehen, nur Archivieren.

---

## 4. Spiel-Modul-Schnittstelle

### 4.1 Vertrag

```ts
type GameType = "flip7" | "wizard" | "doppelkopf";

interface RoundContext<S> {
  participants: Participant[];        // match_players in Sitzreihenfolge
  roundNo: number;                    // 1-basiert
  settings: S;
  previousRounds: Round[];
}

interface GameModule<I, S> {
  id: GameType;
  name: string;
  icon: string;
  color: string;                      // CSS-Variable, z. B. "var(--game-flip7)"
  minPlayers: number;
  maxPlayers: number;
  fixedGroup: boolean;                // true = Spieler kommen aus einer Runde (Doppelkopf)
  defaultSettings: S;

  emptyInput(ctx: RoundContext<S>): I;
  validateRound(input: I, ctx: RoundContext<S>): string[];        // leer = gültig
  scoreRound(input: I, ctx: RoundContext<S>): Record<string, number>;
  matchStatus(totals: Record<string, number>, ctx: RoundContext<S>): "running" | "suggestEnd" | "finished";

  RoundForm: React.FC<{ value: I; onChange: (v: I) => void; ctx: RoundContext<S> }>;
}
```

`validateRound`, `scoreRound` und `matchStatus` sind reine Funktionen. `RoundForm` ist die einzige UI-Komponente des Moduls.

**(1.1) Umsetzung:** Der Vertrag ist zweigeteilt, damit `src/games/` ohne React testbar bleibt: `GameLogic` (Datei `module.ts`, reine Funktionen mit Tests) und `GameModule = GameLogic + RoundForm` (zusammengesetzt in `registry.ts`). Zusätzlich zum Vertrag oben:
- `settingFields` beschreibt die Einstellungen als Daten (Zahl mit min/max oder Schalter); die UI baut daraus das Formular. `validateSettings` prüft sie.
- `totalRounds(ctx)` (optional) nennt die feste Rundenzahl (Wizard).
- `describeRound(input, ctx)` (optional) beschreibt eine Runde im Verlauf, z. B. „Solo (2) … gewonnen“.
- `Participant` = `{ id (match_player_id), name, playerId?, photoPath?, archived? }`.
- Bei `matchStatus` ist `ctx.roundNo` die Nummer der zuletzt gespielten Runde.

**Registrierung:** `src/games/registry.ts` exportiert die Liste aller Module. Startseite, Historie und Hall of Fame lesen ausschließlich aus dieser Liste.

### 4.2 Flip 7

| Element | Spezifikation |
|---|---|
| Spieler | 3–8, `fixedGroup: false` |
| Settings | `{ target: number }`, Standard 200, erlaubt 50–1000 |
| Input | `{ points: Record<participantId, number> }` |
| Validierung | Jeder Teilnehmer hat einen Wert; ganze Zahl ≥ 0 |
| Wertung | Punkte werden 1:1 übernommen |
| Status | `suggestEnd`, sobald ein Gesamtstand ≥ `target`; sonst `running` |

### 4.3 Wizard

| Element | Spezifikation |
|---|---|
| Spieler | 3–6, `fixedGroup: false` |
| Settings | `{ forbidExactBids: boolean }`, Standard `false` (Hausregel) |
| Input | `{ bids: Record<id, number>, tricks: Record<id, number> }` |
| Rundenzahl | `60 / Spielerzahl` (20 / 15 / 12 / 10) |
| Validierung | Werte ganzzahlig, 0 ≤ Wert ≤ `roundNo`; Summe `tricks` = `roundNo`; bei Hausregel: Summe `bids` ≠ `roundNo` |
| Wertung | Treffer: `20 + 10 × tricks`; sonst `−10 × |bid − tricks|` |
| Status | `finished`, wenn `roundNo` = Rundenzahl; sonst `running` |

### 4.4 Doppelkopf

| Element | Spezifikation |
|---|---|
| Spieler | genau 4, `fixedGroup: true` (aus `group_members`) |
| Settings | `{}` |
| Input | `{ type: "normal", winners: [id, id], value: n }` oder `{ type: "solo", soloist: id, soloWon: boolean, value: n }` |
| Validierung | `value` ganzzahlig ≥ 1; Normalspiel: genau 2 verschiedene Gewinner; Solo: genau 1 Solist |
| Wertung | Normal: Gewinner `+value`, Verlierer `−value`. Solo gewonnen: Solist `+3·value`, andere `−value`. Solo verloren: Solist `−3·value`, andere `+value` |
| Invariante | Summe aller Punkte einer Runde = 0 (wird zusätzlich geprüft) |
| Status | immer `running`; Abschluss nur manuell |

### 4.5 Pflicht-Testfälle (aus PRD-Akzeptanzkriterien)

| # | Modul | Eingabe | Erwartung |
|---|---|---|---|
| T1 | Wizard | Ansage 2, Stiche 2 | +40 |
| T2 | Wizard | Ansage 1, Stiche 3 | −20 |
| T3 | Wizard | Runde 3, Stichsumme 2 | Validierungsfehler |
| T4 | Wizard | Hausregel an, Runde 3, Ansagesumme 3 | Validierungsfehler |
| T5 | Doppelkopf | Normalspiel, Wert 3 | Gewinner je +3, Verlierer je −3 |
| T6 | Doppelkopf | Solo gewonnen, Wert 2 | Solist +6, andere je −2 |
| T7 | Doppelkopf | Solo verloren, Wert 1 | Solist −3, andere je +1 |
| T8 | Doppelkopf | beliebige gültige Eingabe | Summe = 0 |
| T9 | Flip 7 | Gesamtstand 205, Ziel 200 | `suggestEnd` |
| T10 | Flip 7 | Wert −5 | Validierungsfehler |

---

## 5. Partie-Ablauf

1. **Anlegen:** Spiel wählen → Teilnehmer wählen (bzw. Runde bei Doppelkopf) → Settings → `matches` + `match_players` anlegen, `status = open`.
2. **Runde eintragen:** `RoundForm` → `validateRound` → bei Erfolg `scoreRound` → `rounds` speichern.
3. **Korrigieren:** bestehende Runde öffnen, Input ändern, erneut validieren und berechnen.
4. **Statusprüfung** nach jeder Runde mit `matchStatus`: bei `suggestEnd` Hinweis „Partie beenden?“, bei `finished` automatisch zum Abschluss. (1.1) „Automatisch zum Abschluss“ heißt: Der Abschluss-Dialog öffnet sich von selbst und lässt sich zum Korrigieren einer Runde schließen.
5. **Abschluss:** `final_score` = Summe der Rundenpunkte; `is_winner` = alle mit maximalem `final_score`; `status = finished`, `finished_at` setzen.
6. **Offene Partien** erscheinen auf der Startseite zum Fortsetzen.
7. (1.1) **Beendete Partien sind schreibgeschützt.** Korrekturen sind nur vor dem Abschluss möglich; der Admin kann eine Partie löschen.

---

## 6. Hall-of-Fame-Berechnung

Datei `src/domain/hallOfFame.ts`, reine Funktion, getestet.

- **Grundmenge:** Partien mit `status = finished` des gewählten Spiels; bei Doppelkopf optional gefiltert nach `group_id` (Ansichten: Gesamt, Runde A, Runde B).
- **Teilnehmer:** nur `match_players` mit `player_id` (keine Gäste). Archivierte Spieler bleiben sichtbar, gekennzeichnet.

| Kennzahl | Berechnung |
|---|---|
| Partien | Anzahl Partien mit Teilnahme |
| Siege | Anzahl Partien mit `is_winner = true` |
| Siegquote | Siege ÷ Partien in %, nur bei ≥ 5 Partien, sonst „–“ |
| Ewige Tabelle | Summe `final_score`; dazu Ø = Summe ÷ Partien (1 Nachkommastelle) |
| Höchste Punktzahl | max. `final_score` über alle Partien (Spieler + Wert + Datum) |
| Längste Siegesserie | Partien des Spielers nach `finished_at` sortiert; längste Folge mit `is_winner = true`. Partien ohne Teilnahme unterbrechen die Serie nicht |

**Sortierung:** Doppelkopf nach Ewiger Tabelle, Flip 7 und Wizard nach Siegen (Gleichstand: Siegquote, dann Ø Punkte).

**Pflicht-Testfälle:** H1 Gleichstand ergibt zwei Sieger · H2 Gäste fehlen in allen Kennzahlen · H3 Siegquote bei 4 Partien „–“ · H4 Serie 3 wird durch eine Niederlage beendet · H5 Filter Runde A ignoriert Partien von Runde B.

---

## 7. Screens und Navigation

| # | Route | Screen | Inhalt | Zugriff |
|---|---|---|---|---|
| S1 | `#/login` | Login | E-Mail + Passwort, keine Registrierung | alle (ab Phase 4) |
| S2 | `#/` | Start | Logo, Slogan, Spielkacheln aus `registry`, offene Partien | angemeldet |
| S3 | `#/neu/:gameType` | Neue Partie | Teilnehmerwahl (min/max aus Modul) oder Rundenwahl, Gäste, Settings | angemeldet |
| S4 | `#/partie/:id` | Spielstand | Rangliste mit Fotos, Rundenverlauf, „Runde eintragen“, „Partie beenden“ | angemeldet |
| S5 | `#/partie/:id/runde/:roundNo` | Runde eintragen/korrigieren | `RoundForm` des Moduls, Fehlermeldungen aus `validateRound` | angemeldet |
| S6 | `#/historie` | Historie | Liste, Filter Spiel (+ Runde), Sieger; Tipp öffnet S4 schreibgeschützt | angemeldet |
| S7 | `#/hall-of-fame/:gameType` | Hall of Fame | Reiter pro Spiel; bei Doppelkopf Filter Gesamt/Runde A/Runde B | angemeldet |
| S8 | `#/verwaltung` | Verwaltung | Spieler anlegen/archivieren, Fotos, Runden umbenennen, Konten einladen | nur Admin |

**Navigation:** feste untere Leiste mit Start, Historie, Hall of Fame, Verwaltung (letzteres nur für Admin sichtbar). (1.1) `#/hall-of-fame` ohne Spiel öffnet das erste Spiel der `registry`. S8 enthält zusätzlich Doppelkopf-Runden anlegen und Backup (Export/Import). Spielablauf: S3 → S4 ⇄ S5 → Abschluss → S4 (beendet).

**Gemeinsame Komponenten:** `Avatar` (rundes Foto oder Initialen), `PlayerRow` (Avatar links + Name + Wert rechts), `GameTile`, `BottomNav`, `ErrorList`.

---

## 8. Design-System

| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--color-fox` | `#E8772E` | `#F08A45` | Primärfarbe, Hauptaktionen |
| `--color-cream` | `#FFF6E5` | `#1B2A2F` | Hintergrund |
| `--color-petrol` | `#1F4E5A` | `#CFE3E6` | Text, Kopfbereiche |
| `--game-flip7` | `#F2B134` | `#F5C25E` | Kachel Flip 7 |
| `--game-wizard` | `#5B4B8A` | `#9C8CD0` | Kachel Wizard |
| `--game-doppelkopf` | `#2E7D6B` | `#5DB39E` | Kachel Doppelkopf |

- Dunkelmodus über `@media (prefers-color-scheme: dark)`.
- Mindestgröße für Bedienelemente 44 × 44 px; Haupt-Aktionen im unteren Bildschirmdrittel.
- Zahlenfelder mit `inputmode="numeric"` für die Handy-Zifferntastatur.
- Logo als SVG in `src/assets/logo.svg` (eigener Entwurf: Fuchskopf mit Kartenfächer).

---

## 9. Sicherheit (ab Phase 4)

**Zugriffsregeln (Row Level Security) in Supabase**, Hilfsfunktion `is_admin()` prüft `profiles.role`:

| Tabelle | Lesen | Anlegen / Ändern | Löschen |
|---|---|---|---|
| `players`, `groups`, `group_members` | angemeldet | Admin | – (archivieren) |
| `matches`, `match_players`, `rounds` | angemeldet | angemeldet | Admin |
| `profiles` | angemeldet | Admin (Rolle und Verknüpfung) | Admin |

- **Selbstregistrierung deaktiviert**; Konten per Einladung aus dem Supabase-Dashboard bzw. S8.
  (1.1) Umsetzung: Der Admin legt Konten im Dashboard mit Startpasswort an („Create new user“). Ein Einladungs-Link bräuchte einen Bildschirm zum Passwort-Setzen und kollidiert mit dem HashRouter (Supabase schickt die Anmeldedaten im `#`-Teil der Adresse). Das Einladen aus S8 bräuchte den `service_role`-Schlüssel und entfällt deshalb. S8 legt Rolle und Spieler-Verknüpfung fest. Ein Trigger legt zu jedem neuen Konto ein Profil mit Rolle `member` an.
- (1.1) **Mehrteilige Schreibvorgänge als Datenbankfunktionen** (`create_match`, `finish_match`, `save_group`), damit sie ganz oder gar nicht passieren. Sie laufen mit den Rechten des Aufrufers (`security invoker`), RLS gilt also weiter.
- **Storage-Bucket `player-photos`: privat.** Lesen nur angemeldet über zeitlich begrenzte signierte URLs; Schreiben nur Admin.
- **Fotos:** im Browser auf 256 × 256 px quadratisch zugeschnitten, als JPEG (Qualität 0,8) hochgeladen; Pfad `player-photos/<player_id>.jpg`.
- **Schlüssel:** Supabase-URL und `anon`-Schlüssel liegen in `.env` und als GitHub-Actions-Secrets; der `anon`-Schlüssel ist für den Browser gedacht und nur zusammen mit RLS sicher. Der `service_role`-Schlüssel wird **nie** im Frontend oder Repository verwendet. `.env` steht in `.gitignore`, `.env.example` dokumentiert die Variablen ohne Werte.

---

## 10. Ordnerstruktur

```
foxy-spielebox/
├─ PRD.md · SPEC.md · README.md
├─ .env.example · .gitignore
├─ .github/workflows/deploy.yml     # Build + Veröffentlichung auf GitHub Pages
├─ .github/workflows/supabase-ping.yml  # (1.1) wöchentlicher Ping (§12)
├─ supabase/migrations/             # SQL für Tabellen und RLS (Phase 4)
└─ src/
   ├─ main.tsx · App.tsx            # Einstieg, Router, BottomNav
   ├─ screens/                      # S1–S8
   ├─ components/                   # Avatar, PlayerRow, GameTile, …
   ├─ games/
   │  ├─ types.ts                   # GameModule-Vertrag
   │  ├─ registry.ts
   │  ├─ flip7/      (module.ts · RoundForm.tsx · module.test.ts)
   │  ├─ wizard/     (…)
   │  └─ doppelkopf/ (…)
   ├─ domain/                       # types.ts, match.ts, hallOfFame.ts (+ Tests)
   ├─ data/                         # repository.ts, localRepository.ts, supabaseRepository.ts
   │                                #   (1.1) + index.ts, photos.ts, auth.ts, supabaseServices.ts, supabaseMapping.ts, seed.ts
   ├─ styles/theme.css
   └─ assets/logo.svg
```

`vite.config.ts` setzt `base: "/foxy-spielebox/"`, damit die App unter der GitHub-Pages-Adresse funktioniert.

---

## 11. Qualität

**Definition of Done je Inkrement:**
- `npm run build` ohne Fehler, `npm test` grün
- Alle zutreffenden Pflicht-Testfälle (§4.5, §6) als automatisierte Tests vorhanden
- Auf dem Handy getestet (Hoch- und Querformat, hell und dunkel)
- Commit mit aussagekräftiger Beschreibung

---

## 12. Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Supabase pausiert Gratis-Projekte nach 7 Tagen ohne Nutzung | Wöchentlicher automatischer „Ping“ per GitHub Action (geplanter Workflow); alternativ manuelles Fortsetzen im Dashboard |
| Keine automatischen Backups im Gratis-Tarif | Export-Funktion in S8: alle Daten als JSON-Datei herunterladen |
| Daten der lokalen Phase gehen beim Umzug verloren | Einmalige Import-Funktion JSON → Supabase in Phase 4 |
| Gleichzeitiges Eintragen auf zwei Geräten | Laut PRD-Annahme ausgeschlossen; „zuletzt gespeichert gewinnt“ |
| Fehlerhafte KI-generierte Rechenlogik | Pflicht-Testfälle aus der Spezifikation, Tests vor dem Merge |

---

## 13. Umsetzungsplan

| Inkrement | Inhalt | Ergebnis |
|---|---|---|
| **2.1** | Projekt-Setup: Vite + React + TS, Vitest, Router, Ordnerstruktur, Theme | Leere App mit Navigation läuft lokal |
| **2.2** | Domain-Typen, Repository-Schnittstelle, `LocalRepository`, Test-Spieler mit Fantasienamen | Daten lokal speicherbar |
| **2.3** | `GameModule`-Vertrag, Flip-7-Modul inkl. Tests T9–T10 | Logik grün getestet |
| **2.4** | Screens S2–S5 für Flip 7, Partie-Abschluss | Flip 7 komplett spielbar |
| **2.5** | Logo, Feinschliff Design | Erste vorzeigbare Version |
| **3** | GitHub-Actions-Workflow, `base`-Pfad, Veröffentlichung | Live unter `jcologne2026.github.io/foxy-spielebox` |
| **4** | Supabase: Migrationen, RLS, Auth, `SupabaseRepository`, Fotos, Import | Gemeinsame Daten mit Login |
| **5** | Wizard, Doppelkopf, Historie, Hall of Fame | MVP vollständig |

(1.1) **Reihenfolge der Umsetzung:** 2.1 → 2.2 → 3 (vorgezogen) → 2.3 → 2.4 → 2.5 → 5 → 4. Inkrement 4 ist als Code fertig und wird aktiv, sobald das Supabase-Projekt eingerichtet ist (Anleitung in der README).
