// Spiel-Modul-Vertrag nach SPEC §4.1.
// Aufgeteilt in zwei Teile, damit die Logik ohne React testbar bleibt:
//  - GameLogic: reine Daten und Funktionen (module.ts je Spiel, mit Tests)
//  - GameModule: GameLogic + Eingabemaske RoundForm (zusammengesetzt in registry.ts)
import type { ComponentType } from "react";
import type { GameType, Participant, Round } from "../domain/types";

export type { Participant };

export interface RoundContext<S> {
  /** Teilnehmer in Sitzreihenfolge. */
  participants: Participant[];
  /** 1-basiert. Bei matchStatus: Nummer der zuletzt gespielten Runde. */
  roundNo: number;
  settings: S;
  /** Alle anderen bereits gespeicherten Runden der Partie. */
  previousRounds: Round[];
}

export type MatchProgress = "running" | "suggestEnd" | "finished";

/** Beschreibung eines Einstellungsfelds – die UI baut daraus das Formular. */
export type SettingField =
  | { key: string; label: string; kind: "number"; min: number; max: number; step?: number }
  | { key: string; label: string; kind: "boolean"; hint?: string };

export interface GameLogic<I, S> {
  id: GameType;
  name: string;
  /** Emoji als Symbol der Spielkachel. */
  icon: string;
  /** CSS-Variable, z. B. "var(--game-flip7)". */
  color: string;
  minPlayers: number;
  maxPlayers: number;
  /** true = Spieler kommen aus einer festen Runde (Doppelkopf). */
  fixedGroup: boolean;
  defaultSettings: S;
  settingFields: SettingField[];
  /** Leer = Einstellungen gültig. */
  validateSettings(settings: S): string[];

  /** Gesamtzahl der Runden, falls vom Spiel festgelegt (Wizard). */
  totalRounds?(ctx: RoundContext<S>): number;

  emptyInput(ctx: RoundContext<S>): I;
  /** Leer = gültig, sonst Fehlermeldungen auf Deutsch. */
  validateRound(input: I, ctx: RoundContext<S>): string[];
  /** Punkte je Teilnehmer-ID. Nur für gültige Eingaben aufrufen. */
  scoreRound(input: I, ctx: RoundContext<S>): Record<string, number>;
  matchStatus(totals: Record<string, number>, ctx: RoundContext<S>): MatchProgress;
  /** Optionale Kurzbeschreibung einer Runde für den Verlauf, z. B. „Solo Bruno Bär gewonnen“. */
  describeRound?(input: I, ctx: RoundContext<S>): string;
}

export interface RoundFormProps<I, S> {
  value: I;
  onChange: (value: I) => void;
  ctx: RoundContext<S>;
}

export interface GameModule<I, S> extends GameLogic<I, S> {
  RoundForm: ComponentType<RoundFormProps<I, S>>;
}

/** Modul mit unbekannten Typen – so stehen alle Spiele in einer Liste. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameModule = GameModule<any, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGameLogic = GameLogic<any, any>;
