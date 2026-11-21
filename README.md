# foxy-spielebox

**Spielebox der Foxy-Bande – Karten raus, Punkte rein!**

Erfassung aller Punkte unserer Spieleabende. Die App rechnet anhand der Regeln die Punkte selbst zusammen, erfasst die Punkte pro Spieleabend und wertet ebenfalls Highscores und eine Hall of Fame über alle eingetragenen Spiele aus. Die App kann um beliebige Spiele und Spieler erweitert werden.

Live: <https://jcologne2026.github.io/foxy-spielebox/>

Anforderungen stehen in der [PRD.md](PRD.md), die technische Umsetzung in der [SPEC.md](SPEC.md).

## Was die App kann

- **Doppelkopf** in festen Vierer-Runden: Normalspiel oder Solo, Gewinner und Spielwert eintragen, die App rechnet
- **Flip 7** mit 3–8 Spielern und einstellbarem Zielwert (Standard 200)
- **Wizard** mit 3–6 Spielern: Ansagen und Stiche eintragen, optionale Hausregel
- Runden nachträglich korrigieren, Gäste ohne Konto, offene Partien fortsetzen
- **Historie** aller Partien und **Hall of Fame** pro Spiel (bei Doppelkopf zusätzlich pro Runde)
- **Verwaltung** für Spieler, Profilfotos, Doppelkopf-Runden, Konten und Backup (Export/Import als JSON)
- Fürs Handy gemacht, mit Hell- und Dunkelmodus

## Befehle

```bash
npm install        # einmalig: Pakete installieren
npm run dev        # Entwicklungsserver (mit -- --host fürs Handy im WLAN)
npm test           # Tests einmal ausführen
npm run build      # Typen prüfen und Produktions-Build erzeugen
```

Jeder Push auf `main` testet, baut und veröffentlicht die App automatisch auf GitHub Pages ([deploy.yml](.github/workflows/deploy.yml)). Ist ein Test rot, wird nichts veröffentlicht.

## Zwei Betriebsarten

| | Lokaler Modus | Supabase-Modus |
|---|---|---|
| Wann | ohne Supabase-Zugangsdaten | `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` sind gesetzt |
| Daten | nur im eigenen Browser (localStorage) | gemeinsam für alle Geräte |
| Login | keiner, jeder ist Admin | E-Mail und Passwort, Rollen Admin und Mitglied |
| Test-Spieler | bei `npm run dev` automatisch (Fantasienamen) | keine |

## Supabase einrichten (Phase 4)

Diese Schritte macht der Admin einmalig im Browser. Echte Namen, Fotos und Schlüssel stehen danach nur in Supabase bzw. in den GitHub-Secrets, nie im Repository.

1. **Projekt anlegen** auf [supabase.com](https://supabase.com) (Gratis-Tarif, Region z. B. Frankfurt). Das Datenbank-Passwort sicher aufbewahren.
2. **Tabellen und Zugriffsregeln anlegen:** Im Dashboard **SQL Editor** öffnen, den Inhalt von [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) einfügen und **Run** klicken.
3. **Selbstregistrierung abschalten:** Unter **Authentication → Sign In / Providers** die Option *Allow new users to sign up* ausschalten. E-Mail-Login bleibt aktiv.
4. **Eigenes Konto anlegen:** Unter **Authentication → Users → Add user → Create new user** E-Mail und Passwort eingeben und *Auto Confirm User* anhaken.
5. **Dich zum Admin machen:** Im **SQL Editor** ausführen (mit deiner E-Mail-Adresse):
   ```sql
   update public.profiles set role = 'admin' where email = 'deine@adresse.de';
   ```
6. **Zugangsdaten eintragen:** Unter **Project Settings → API** die *Project URL* und den *anon*-/*publishable*-Schlüssel kopieren.
   - **Lokal:** `.env.example` als `.env` kopieren und beide Werte eintragen. `.env` wird nie committet.
   - **Für GitHub Pages:** Im Repository unter **Settings → Secrets and variables → Actions** zwei Secrets anlegen: `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`.
   - Den *service_role*-Schlüssel **nie** verwenden, weder in `.env` noch als Secret.
7. **Neu veröffentlichen:** Beim nächsten Push auf `main` baut GitHub die App im Supabase-Modus (oder im Tab *Actions* den Workflow *Deploy auf GitHub Pages* per *Run workflow* starten).
8. **Weitere Konten:** wie in Schritt 4 anlegen und das Startpasswort persönlich weitergeben. Danach erscheint das Konto in der App unter **Verwaltung → Konten**. Dort legst du Rolle und Spieler fest.

**Daten aus dem lokalen Modus übernehmen:** In dem Browser, in dem bisher eingetragen wurde, unter **Verwaltung → Backup → Exportieren** eine JSON-Datei speichern. Dann in der App mit Supabase als Admin anmelden und die Datei unter **Verwaltung → Backup → Importieren** einlesen. Fotos aus dem Browser werden dabei in den Foto-Speicher hochgeladen.

**Projekt wach halten:** Supabase pausiert Gratis-Projekte nach 7 Tagen ohne Nutzung. Der Workflow [supabase-ping.yml](.github/workflows/supabase-ping.yml) fragt deshalb jeden Montag die Datenbank an. Er nutzt dieselben beiden Secrets.

## Ein neues Spiel hinzufügen

1. Ordner `src/games/<spiel>/` anlegen mit
   - `module.ts`: Regeln als reine Funktionen (`validateRound`, `scoreRound`, `matchStatus`, …), Vertrag in [src/games/types.ts](src/games/types.ts)
   - `module.test.ts`: Tests für Wertung und Prüfregeln
   - `RoundForm.tsx`: Eingabemaske einer Runde
2. Das Modul in [src/games/registry.ts](src/games/registry.ts) eintragen. Startseite, Historie und Hall of Fame zeigen es dann automatisch.
3. Bei Supabase zusätzlich den neuen Spielnamen in der Prüfregel `matches.game_type` erlauben (neue Migration in `supabase/migrations/`).

## Aufbau

```
src/
├─ screens/      Bildschirme S1–S8 (UI)
├─ components/   gemeinsame Bausteine: Avatar, PlayerRow, GameTile, …
├─ games/        Spiel-Module (Logik + Eingabemaske) und registry.ts
├─ domain/       Typen, Partie-Logik, Hall-of-Fame-Berechnung (reine Funktionen)
└─ data/         Repository: lokal (localStorage) oder Supabase
```

Schichtrichtung **UI → Logik → Daten**. Die Spiel-Logik ist frei von React und Datenbank und vollständig getestet.
