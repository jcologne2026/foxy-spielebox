# PRD – Spielebox der Foxy-Bande

> **Slogan:** Spielebox der Foxy-Bande – Karten raus, Punkte rein!
> **Version:** 1.1 · **Stand:** 15.11.2026 · **Owner:** Projektinhaber (Admin)

---

## 1. Vision & Ziel

Die Foxy-Bande (Familie plus Freunde) schreibt ihre Kartenspiele digital auf, statt Block und Stift zu nutzen. Die App rechnet die Punkte, speichert jede Partie und zeigt eine dauerhafte **Hall of Fame**.

**Zwei Ziele:**
1. **Produkt:** eine nutzbare Web-App für Doppelkopf, Flip 7 und Wizard, auf allen Familien-Handys synchron.
2. **Lernen:** Spec-Driven Development von der Anforderung über die Spezifikation bis zum Code, inklusive GitHub.

**Erfolgskriterium:** Der nächste Kartenabend wird vollständig mit der App aufgeschrieben, ohne Papier.

---

## 2. Nutzer & Rollen

| Rolle | Wer | Rechte |
|---|---|---|
| **Admin** | Projektinhaber | Alles: Partien anlegen, bearbeiten und löschen, Spieler verwalten inkl. Fotos, Konten einladen |
| **Mitglied** | Familienmitglieder mit Konto | Partien anlegen, eintragen und bearbeiten. Nicht löschen, keine Spieler- oder Kontenverwaltung |

**Wichtig: Konto ≠ Spieler**
- Ein **Konto** regelt, wer eintragen darf (Login).
- Ein **Spieler** ist, wer in der Statistik steht.
- Ein Konto *kann* mit einem Spieler verknüpft sein. Freunde und Kinder sind Spieler ohne Konto.

---

## 3. Funktionsumfang MVP

| # | Feature | Kurzbeschreibung |
|---|---|---|
| F1 | Startseite | Logo, Slogan, drei Spielkacheln, Zugang zur Hall of Fame |
| F2 | Login | Eigenes Konto pro Person, nur auf Einladung |
| F3 | Spielerverwaltung | Zentrale Spielerliste mit Profilfotos, Gäste, Archivieren |
| F4 | Doppelkopf | Feste Vierergruppen, Gewinner + Spielwert, die App rechnet |
| F5 | Flip 7 | Rundenpunkte eintragen, Ziel 200 Punkte |
| F6 | Wizard | Ansage + Stiche eintragen, die App rechnet |
| F7 | Historie | Alle Partien mit Datum, Spielern und Ergebnis |
| F8 | Hall of Fame | Siege und Siegquote, Ewige Tabelle, Rekorde (pro Spiel) |

---

## 4. Spiele

### 4.1 Doppelkopf

**Spielrunden (feste Vierergruppen):**
- Runde A: 2 Gastgeber + Freundespaar A
- Runde B: 2 Gastgeber + Freundespaar B

> Echte Namen stehen ausschließlich in der Datenbank, nicht im Code oder in Spezifikationen.

**Eingabe pro Spiel:** Spielart (Normalspiel/Solo), Gewinner, Spielwert (ganze Zahl ≥ 1)

**Berechnung:**

| Spielart | Gewinner | Verlierer |
|---|---|---|
| Normalspiel (2 gegen 2) | je +Spielwert | je −Spielwert |
| Solo gewonnen | Solist +3 × Spielwert | je −Spielwert |
| Solo verloren | je +Spielwert | Solist −3 × Spielwert |

**Prüfregel:** Die Punkte aller Spieler ergeben pro Spiel immer 0.

**Partie:** Ein Abend ist eine Partie. Sie wird manuell beendet, Sieger hat die meisten Punkte. Eine offene Partie lässt sich fortsetzen oder nachträglich abschließen.

**Akzeptanzkriterien:**
- Bei einem Normalspiel mit Spielwert 3 erhalten die Gewinner je +3, die Verlierer je −3.
- Bei einem gewonnenen Solo mit Spielwert 2 erhält der Solist +6, die anderen je −2.
- Spiele lassen sich nachträglich korrigieren. Der Spielstand wird neu berechnet.

### 4.2 Flip 7

- **Spieler:** 3–8, flexibel aus der Spielerliste plus Gäste
- **Eingabe:** Punkte pro Spieler und Runde. Die App rechnet die Karten nicht selbst aus.
- **Spielende:** Erreicht nach einer Runde mindestens ein Spieler den Zielwert (Standard 200, einstellbar), endet die Partie. Sieger hat die höchste Punktzahl.

**Akzeptanzkriterien:**
- Der Zwischenstand wird nach jeder Runde angezeigt.
- Bei Erreichen des Zielwerts schlägt die App das Partieende vor.

### 4.3 Wizard

- **Spieler:** 3–6, flexibel aus der Spielerliste plus Gäste
- **Rundenzahl:** 60 ÷ Spielerzahl (3 Spieler: 20, 4: 15, 5: 12, 6: 10)
- **Eingabe pro Runde:** Ansage und tatsächliche Stiche je Spieler
- **Berechnung:** Treffer ergibt 20 + 10 × Stiche. Abweichung ergibt −10 × |Ansage − Stiche|.
- **Prüfregel:** Die Summe der Stiche entspricht der Rundennummer.
- **Hausregel (optional, ein- und ausschaltbar):** Die Summe der Ansagen darf nicht genau der Rundennummer entsprechen.

**Akzeptanzkriterien:**
- Ansage 2, Stiche 2 ergibt +40. Ansage 1, Stiche 3 ergibt −20.
- Eine Runde mit falscher Stichsumme lässt sich nicht speichern.

---

## 5. Spielerverwaltung

- Zentrale Spielerliste mit Name und Profilfoto (Familie und Freunde)
- **Profilfotos:** Nur der Admin lädt Fotos hoch, ändert oder entfernt sie.
  - Die App verkleinert das Foto beim Hochladen auf ca. 256 × 256 px, quadratisch zugeschnitten.
  - Das Foto erscheint **überall neben dem Namen**: Spielerauswahl, Eingabe, Spielstand, Historie, Hall of Fame.
  - Ohne Foto zeigt die App einen Kreis mit den Initialen.
  - Gäste haben kein Foto, nur Initialen.
- **Gäste** können spontan pro Partie hinzugefügt werden und zählen **nicht** für die Hall of Fame.
- Spieler werden **archiviert statt gelöscht**. Ihre Historie bleibt erhalten.

---

## 6. Historie

- Liste aller Partien, filterbar nach Spiel (und bei Doppelkopf nach Runde)
- Detailansicht: Datum, Spieler, Verlauf der Runden, Endergebnis, Sieger
- Sichtbar ist auch, wer die Partie angelegt hat (Konto).

---

## 7. Hall of Fame

Alle Kennzahlen werden **pro Spiel** geführt, nie spielübergreifend. Gäste sind ausgeschlossen.

| Kennzahl | Definition |
|---|---|
| Siege gesamt | Anzahl gewonnener Partien. Ein Gleichstand ergibt einen geteilten Sieg, er zählt für jeden. |
| Siegquote | Siege ÷ gespielte Partien, angezeigt erst ab 5 Partien |
| Ewige Tabelle | Kumulierte Punkte über alle Partien plus Ø Punkte pro Partie. Bei Doppelkopf ist sie die Hauptkennzahl. |
| Rekord: höchste Punktzahl | Höchstes Endergebnis eines Spielers in einer Partie |
| Rekord: längste Siegesserie | Meiste aufeinanderfolgende Partiesiege desselben Spiels |

---

## 8. Zugang & Sicherheit

- Eigenes Konto pro Person (E-Mail + Passwort)
- **Keine Selbstregistrierung.** Der Admin lädt Konten ein.
- Ohne Login gibt es keinen Lese- oder Schreibzugriff.
- Zugriffsregeln werden **in der Datenbank** durchgesetzt, nicht nur in der Oberfläche.
- Geheime Schlüssel kommen nie ins (öffentliche) GitHub-Repository.
- Profilfotos liegen in einem **nicht öffentlichen** Speicher (Supabase Storage). Nur angemeldete Nutzer können sie abrufen.
- Personenbezogene Daten (Namen, Fotos) stehen nur in der Datenbank, nie im Repository.
- Fotos von Freunden werden nur mit deren Einverständnis hochgeladen.

---

## 9. Design

| Aspekt | Vorgabe |
|---|---|
| Ausrichtung | Zuerst fürs Handy gestaltet, große Bedienelemente, mit einer Hand bedienbar |
| Stil | Warmer Retro-Camper-Look: Fuchs-Orange, Creme, dunkles Petrol |
| Logo | Eigener Entwurf: Fuchskopf mit Spielkarten-Fächer, optional Bus-Silhouette (SVG) |
| Startseite | Logo, Slogan, drei Spielkacheln mit eigenem Symbol und eigener Farbe |
| Dunkelmodus | Automatisch nach Geräteeinstellung |
| Spieleranzeige | Rundes Profilfoto (oder Initialen) immer links neben dem Namen |

---

## 10. Erweiterbarkeit

Jedes Spiel ist ein **Spiel-Modul** mit einheitlicher Struktur:
- Spieleranzahl (min/max)
- Eingabefelder pro Runde
- Punkteformel
- Prüfregeln
- Regel für das Partieende

Ein neues Spiel heißt dann: ein neues Modul anlegen, ohne die Kernlogik umzubauen.

---

## 11. Nicht im MVP

- Bockrunden und Pflichtsolo bei Doppelkopf
- Automatische Kartenwertung bei Flip 7
- Statistik pro Doppelkopf-Runde und Vergleich der Runden
- Offline-Modus mit späterem Abgleich
- Fotos, Kommentare, Teilen in sozialen Medien
- Konten für Freunde
- Native App für iOS/Android mit Veröffentlichung im Store (Folgeprojekt auf Basis dieser PRD und desselben Backends)

---

## 12. Technische Rahmenbedingungen

| Bereich | Entscheidung |
|---|---|
| Plattform | Web-App im Browser, kein App-Store |
| Hosting | GitHub Pages |
| Daten & Login | Supabase (Gratis-Tarif) |
| Code-Verwaltung | GitHub-Repository |
| Datenmodell | Von Beginn an datenbanktauglich, auch während der lokalen Phase |

---

## 13. Umsetzungsphasen

| Phase | Ergebnis |
|---|---|
| 0 | GitHub-Account und Repository, PRD.md eingecheckt |
| 1 | SPEC.md: Datenmodell, Spiel-Modul-Konzept, Screens |
| 2 | Startseite mit Logo und Flip 7, Speicherung lokal im Browser |
| 3 | Live über GitHub Pages |
| 4 | Supabase: Login, Rollen, zentrale Daten |
| 5 | Wizard, Doppelkopf, Historie, Hall of Fame |

---

## 14. Annahmen

- Pro Partie trägt ein Gerät ein, kein gleichzeitiges Bearbeiten derselben Partie.
- Die Nutzung bleibt im Rahmen des kostenlosen Supabase-Tarifs.
- Doppelkopf wird immer zu viert gespielt, ohne aussetzenden Spieler.
