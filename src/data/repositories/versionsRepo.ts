// ============================================================================
// versionsRepo — cronologia delle versioni di un preventivo.
// Il corpo del preventivo (oggetto Quote del dominio) viaggia in `data` (JSONB);
// uno snapshot dei totali in `totali` per archivio/PDF senza ricalcolo.
// ============================================================================
import { requireSupabase } from '@/data/supabase/client';
import type { QuoteVersionRow } from '@/data/supabase/types';
import type { Quote, QuoteTotals } from '@/domain/types';

/** Tutte le versioni di un preventivo, dalla più recente alla più vecchia. */
export async function listByQuote(quoteId: string): Promise<QuoteVersionRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('quote_versions')
    .select('*')
    .eq('quote_id', quoteId)
    .order('version_no', { ascending: false });

  if (error) throw error;
  return (data ?? []) as QuoteVersionRow[];
}

/** Versione più recente di un preventivo (null se non ne esiste nessuna). */
export async function latestByQuote(quoteId: string): Promise<QuoteVersionRow | null> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('quote_versions')
    .select('*')
    .eq('quote_id', quoteId)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as QuoteVersionRow | null) ?? null;
}

/** Singola versione per id. */
export async function get(id: string): Promise<QuoteVersionRow> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('quote_versions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as QuoteVersionRow;
}

/**
 * Sovrascrive in place il corpo di una versione esistente.
 * Usato dall'autosave: aggiorna la versione corrente senza crearne una nuova,
 * così la cronologia resta fatta di snapshot intenzionali (non un'entry per tasto).
 */
export async function updateData(
  versionId: string,
  data: Quote,
  totali: QuoteTotals,
): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('quote_versions')
    .update({ data, totali })
    .eq('id', versionId);

  if (error) throw error;
}

/**
 * Crea una nuova versione per un preventivo, calcolando in automatico il
 * progressivo version_no successivo. Ritorna la riga creata.
 */
export async function create(input: {
  quoteId: string;
  data: Quote;
  totali: QuoteTotals;
  autoreId: string;
  label?: string;
}): Promise<QuoteVersionRow> {
  const sb = requireSupabase();

  const { data: last, error: lastErr } = await sb
    .from('quote_versions')
    .select('version_no')
    .eq('quote_id', input.quoteId)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastErr) throw lastErr;
  const nextNo = (last?.version_no ?? 0) + 1;

  const { data, error } = await sb
    .from('quote_versions')
    .insert({
      quote_id: input.quoteId,
      version_no: nextNo,
      label: input.label ?? `v${nextNo}`,
      data: input.data,
      totali: input.totali,
      autore_id: input.autoreId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as QuoteVersionRow;
}
