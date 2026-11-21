/**
 * Schneidet ein Bild mittig quadratisch zu und verkleinert es (SPEC §9):
 * 256 × 256 px, JPEG mit Qualität 0,8.
 */
export async function cropToSquareJpeg(file: File, size = 256, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Das Foto konnte nicht verarbeitet werden.");
  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Das Foto konnte nicht umgewandelt werden."))), "image/jpeg", quality),
  );
}

/** Startet den Download einer Textdatei im Browser. */
export function downloadText(filename: string, text: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
