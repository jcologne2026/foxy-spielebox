import type React from "react";
import { Link } from "react-router";
import type { AnyGameModule } from "../games/types";

/** Spielkachel mit Symbol und eigener Farbe (SPEC §7 „GameTile“). */
export function GameTile({ module, to }: { module: AnyGameModule; to: string }) {
  return (
    <Link to={to} className="game-tile" style={{ "--tile-color": module.color } as React.CSSProperties}>
      <span className="game-icon" aria-hidden="true">
        {module.icon}
      </span>
      <span className="game-name">{module.name}</span>
      <span className="game-meta">
        {module.fixedGroup ? "feste Vierer-Runde" : `${module.minPlayers}–${module.maxPlayers} Spieler`}
      </span>
    </Link>
  );
}
