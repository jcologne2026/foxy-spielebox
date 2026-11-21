/**
 * Ablage für Profilfotos (SPEC §9).
 * Phase 2: Das Foto steht als Daten-URL direkt in `photoPath` (nur im eigenen Browser).
 * Ab Phase 4: privater Supabase-Bucket `player-photos`, Anzeige über signierte URLs.
 */
export interface PhotoStore {
  /** Anzeigbare URL zum gespeicherten Pfad, oder null. */
  url(photoPath: string): Promise<string | null>;
  /** Speichert ein JPEG und liefert den neuen `photoPath`. */
  upload(playerId: string, jpeg: Blob): Promise<string>;
  /** Entfernt das Foto (falls die Ablage das braucht). */
  remove(photoPath: string): Promise<void>;
}

export class LocalPhotoStore implements PhotoStore {
  async url(photoPath: string): Promise<string | null> {
    return photoPath.startsWith("data:") ? photoPath : null;
  }

  async upload(_playerId: string, jpeg: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Das Foto konnte nicht gelesen werden."));
      reader.readAsDataURL(jpeg);
    });
  }

  async remove(): Promise<void> {
    // nichts zu tun – das Foto steht im Spieler selbst
  }
}
