// ============================================================================
// imagesRepo — immagini caricate dall'utente per la Scheda cliente.
// Riusa il bucket privato 'quote-pdfs' sotto il prefisso images/ (le policy
// esistenti coprono già insert/read/delete per gli autenticati → nessuna
// migrazione necessaria). Nel Quote JSONB viaggia solo il path; il file si
// risolve a runtime in un object URL locale (blob:), che html2canvas cattura
// senza problemi CORS.
// ============================================================================
import { requireSupabase } from '@/data/supabase/client';

const BUCKET = 'quote-pdfs';

/** Carica un'immagine e ritorna il path da salvare nel preventivo. */
export async function upload(input: {
  blob: Blob;
  contentType: string;
  /** Id dominio del preventivo (quote.id), usato come cartella. */
  quoteKey: string;
}): Promise<string> {
  const sb = requireSupabase();
  const ext = input.contentType === 'image/png' ? 'png' : 'jpg';
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `images/${input.quoteKey}/${name}`;

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, input.blob, { contentType: input.contentType, upsert: false });
  if (error) throw error;
  return path;
}

/** Scarica l'immagine (autenticato) e la espone come object URL locale. */
export async function objectUrl(path: string): Promise<string> {
  // Path "dev:<seed>" → placeholder locali del harness /dev/scheda. Solo in
  // dev: in build di produzione import.meta.env.DEV è false e l'intero branch
  // (incluso il modulo importato) viene eliminato dal bundle.
  if (import.meta.env.DEV && path.startsWith('dev:')) {
    const { devPlaceholderUrl } = await import('@/pages/devPlaceholders');
    return devPlaceholderUrl(path.slice(4));
  }
  const sb = requireSupabase();
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error) throw error;
  return URL.createObjectURL(data);
}

/** Rimozione best-effort (il preventivo resta valido anche se fallisce). */
export async function remove(path: string): Promise<void> {
  const sb = requireSupabase();
  await sb.storage.from(BUCKET).remove([path]);
}
