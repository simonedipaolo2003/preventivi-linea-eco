// ============================================================================
// Ridimensionamento immagini lato client prima dell'upload.
// Tiene leggeri storage e autosave: le foto da fotocamera (5-20MB) diventano
// JPEG ~200-500KB, più che sufficienti per un PDF A4. I PNG (loghi) restano
// PNG per conservare la trasparenza.
// ============================================================================

export interface DownscaledImage {
  blob: Blob;
  contentType: 'image/jpeg' | 'image/png';
}

/** Ridimensiona al lato massimo indicato (mai ingrandisce). */
export async function downscaleImage(file: File, maxDim = 1600): Promise<DownscaledImage> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D non disponibile');
    ctx.drawImage(bitmap, 0, 0, w, h);

    const contentType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Conversione immagine fallita'))),
        contentType,
        contentType === 'image/jpeg' ? 0.85 : undefined,
      ),
    );
    return { blob, contentType };
  } finally {
    bitmap.close();
  }
}
