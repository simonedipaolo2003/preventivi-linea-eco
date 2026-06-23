// ============================================================================
// exportsRepo — PDF esportati salvati nello Storage privato + metadati.
// Bucket: 'quote-pdfs' (privato). Path: <quoteId>/<timestamp>-<modalita>.pdf
// L'accesso ai file avviene tramite signed URL temporanee.
// ============================================================================
import { requireSupabase } from '@/data/supabase/client';
import type { QuoteExportRow } from '@/data/supabase/types';

const BUCKET = 'quote-pdfs';

export type ExportModalita = 'cliente' | 'interna';

/** Storico esportazioni di un preventivo (più recenti prima). */
export async function listByQuote(quoteId: string): Promise<QuoteExportRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('quote_exports')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as QuoteExportRow[];
}

/**
 * Carica un PDF nello storage e registra i metadati in quote_exports.
 * Marca anche has_pdf=true sul preventivo. Ritorna la riga creata.
 */
export async function upload(input: {
  quoteId: string;
  versionId?: string | null;
  blob: Blob;
  modalita: ExportModalita;
  autoreId: string;
}): Promise<QuoteExportRow> {
  const sb = requireSupabase();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `${input.quoteId}/${ts}-${input.modalita}.pdf`;

  const { error: upErr } = await sb.storage
    .from(BUCKET)
    .upload(path, input.blob, { contentType: 'application/pdf', upsert: false });
  if (upErr) throw upErr;

  const { data, error } = await sb
    .from('quote_exports')
    .insert({
      quote_id: input.quoteId,
      version_id: input.versionId ?? null,
      storage_path: path,
      modalita: input.modalita,
      autore_id: input.autoreId,
    })
    .select('*')
    .single();

  if (error) throw error;

  await sb.from('quotes').update({ has_pdf: true }).eq('id', input.quoteId);

  return data as QuoteExportRow;
}

/** Signed URL temporanea per scaricare/visualizzare un PDF. */
export async function signedUrl(
  storagePath: string,
  expiresInSec = 60 * 10,
): Promise<string> {
  const sb = requireSupabase();
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSec);

  if (error) throw error;
  return data.signedUrl;
}

/** Rimuove un PDF (file + record). Cancellazione consentita agli admin via RLS. */
export async function remove(exportRow: QuoteExportRow): Promise<void> {
  const sb = requireSupabase();
  const { error: sErr } = await sb.storage.from(BUCKET).remove([exportRow.storage_path]);
  if (sErr) throw sErr;
  const { error } = await sb.from('quote_exports').delete().eq('id', exportRow.id);
  if (error) throw error;
}
