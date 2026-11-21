import { useEffect, useState, type ReactNode } from "react";
import { photos } from "../data";
import { initials } from "./format";

// Zwischenspeicher, damit signierte URLs nicht bei jedem Rendern neu geholt werden.
// Signierte URLs gelten 60 Minuten – Einträge verfallen darum nach 50 Minuten.
const MAX_AGE_MS = 50 * 60 * 1000;
const urlCache = new Map<string, { url: Promise<string | null>; at: number }>();

/** Nach dem Ändern oder Entfernen eines Fotos aufrufen, damit das neue Bild erscheint. */
export function forgetPhotoUrl(photoPath?: string): void {
  if (photoPath) urlCache.delete(photoPath);
}

function usePhotoUrl(photoPath?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!photoPath) {
      setUrl(null);
      return;
    }
    let active = true;
    let entry = urlCache.get(photoPath);
    if (!entry || Date.now() - entry.at > MAX_AGE_MS) {
      entry = { url: photos.url(photoPath).catch(() => null), at: Date.now() };
      urlCache.set(photoPath, entry);
    }
    entry.url.then((u) => active && setUrl(u));
    return () => {
      active = false;
    };
  }, [photoPath]);
  return url;
}

/** Rundes Profilfoto oder Kreis mit Initialen (SPEC §7, PRD §5). */
export function Avatar({ name, photoPath, size = 40 }: { name: string; photoPath?: string; size?: number }) {
  const url = usePhotoUrl(photoPath);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  );
}

/** Zeile: Avatar links, Name, Wert rechts (SPEC §7 „PlayerRow“). */
export function PlayerRow({
  name,
  photoPath,
  archived,
  guest,
  value,
  sub,
  highlight,
}: {
  name: string;
  photoPath?: string;
  archived?: boolean;
  guest?: boolean;
  value?: ReactNode;
  sub?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`player-row${highlight ? " highlight" : ""}`}>
      <Avatar name={name} photoPath={photoPath} />
      <span className="player-name">
        {name}
        {guest && <span className="tag">Gast</span>}
        {archived && <span className="tag">archiviert</span>}
        {sub && <small>{sub}</small>}
      </span>
      {value !== undefined && <span className="player-value">{value}</span>}
    </div>
  );
}
