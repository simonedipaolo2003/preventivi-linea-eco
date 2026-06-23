// ============================================================================
// quotesRepo — CRUD dei preventivi + archivio (ricerca, filtri, ordinamento).
//
// Modello ibrido: la tabella `quotes` tiene i campi cercabili/filtrabili come
// colonne reali; il corpo completo (oggetto Quote del dominio) vive nelle
// `quote_versions` come JSONB. `current_version_id` punta alla versione attiva.
// ============================================================================
import { requireSupabase } from '@/data/supabase/client';
import type {
  QuoteRow,
  QuoteListItem,
  QuoteStato,
  QuoteVersionRow,
} from '@/data/supabase/types';
import type { Quote, QuoteTotals } from '@/domain/types';
import * as versionsRepo from './versionsRepo';

// ---- Archivio: filtri / ordinamento ---------------------------------------
export type SortKey = 'updated' | 'created' | 'cliente' | 'totale';

export interface ArchiveFilters {
  /** Testo libero: match su cliente OR riferimento OR codice. */
  search?: string;
  stato?: QuoteStato | 'tutti';
  /** ISO date (inclusive) sul campo updated_at. */
  dalGiorno?: string;
  alGiorno?: string;
  sort?: SortKey;
  ascending?: boolean;
}

const SORT_COLUMN: Record<SortKey, string> = {
  updated: 'updated_at',
  created: 'created_at',
  cliente: 'cliente',
  totale: 'totale_finale',
};

/**
 * Lista per l'archivio, arricchita col nome dell'autore.
 * Esegue il join profilo lato applicazione per restare indipendenti dalle
 * relazioni embedded di PostgREST.
 */
export async function list(filters: ArchiveFilters = {}): Promise<QuoteListItem[]> {
  const sb = requireSupabase();

  let q = sb.from('quotes').select('*');

  if (filters.stato && filters.stato !== 'tutti') {
    q = q.eq('stato', filters.stato);
  }
  if (filters.dalGiorno) q = q.gte('updated_at', filters.dalGiorno);
  if (filters.alGiorno) q = q.lte('updated_at', filters.alGiorno);

  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().replace(/[%,]/g, ' ');
    q = q.or(
      `cliente.ilike.%${term}%,riferimento.ilike.%${term}%,codice.ilike.%${term}%`,
    );
  }

  const sortKey = filters.sort ?? 'updated';
  q = q.order(SORT_COLUMN[sortKey], { ascending: filters.ascending ?? false });

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as QuoteRow[];

  // Arricchimento autore (una sola query sui profili coinvolti).
  const authorIds = [...new Set(rows.map((r) => r.autore_id))];
  const names = new Map<string, string>();
  if (authorIds.length) {
    const { data: profs, error: pErr } = await sb
      .from('profiles')
      .select('id, display_name')
      .in('id', authorIds);
    if (pErr) throw pErr;
    for (const p of profs ?? []) names.set(p.id, p.display_name || '—');
  }

  return rows.map((r) => ({ ...r, autore_nome: names.get(r.autore_id) ?? '—' }));
}

/** Record indicizzato del preventivo. */
export async function get(id: string): Promise<QuoteRow> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('quotes').select('*').eq('id', id).single();
  if (error) throw error;
  return data as QuoteRow;
}

/** Carica record + versione corrente (corpo Quote) in un colpo solo. */
export async function getWithCurrentVersion(
  id: string,
): Promise<{ quote: QuoteRow; version: QuoteVersionRow | null }> {
  let quote = await get(id);
  let version: QuoteVersionRow | null = null;

  if (quote.current_version_id) {
    version = await versionsRepo.get(quote.current_version_id);
  }

  // Fallback: se il puntatore manca o è rotto (es. creazione interrotta a metà
  // tra l'insert del preventivo e il link della versione), ripiega sull'ultima
  // versione esistente e ripara il puntatore, così l'editor non mostra vuoto.
  if (!version) {
    version = await versionsRepo.latestByQuote(id);
    if (version && quote.current_version_id !== version.id) {
      const { data: repaired } = await requireSupabase()
        .from('quotes')
        .update({ current_version_id: version.id })
        .eq('id', id)
        .select('*')
        .single();
      if (repaired) quote = repaired as QuoteRow;
    }
  }

  return { quote, version };
}

/** Campi indicizzati derivati dal corpo Quote, per tenere allineate le colonne. */
function indexFields(data: Quote, totali: QuoteTotals) {
  return {
    cliente: data.header.intestazioneCliente ?? '',
    riferimento: data.header.riferimento ?? '',
    focolare: data.header.focolare ?? '',
    totale_finale: totali.prezzoPrivatiFinale ?? 0,
  };
}

/**
 * Crea un nuovo preventivo + la sua prima versione, e collega
 * current_version_id. Ritorna il record quotes risultante.
 * Il codice (PRV-anno-progr) lo assegna il default DB next_quote_code().
 */
export async function create(input: {
  data: Quote;
  totali: QuoteTotals;
  autoreId: string;
}): Promise<QuoteRow> {
  const sb = requireSupabase();
  const idx = indexFields(input.data, input.totali);

  // Lo stato lifecycle iniziale rispecchia quello del corpo (bozza/definitivo).
  const initialStato: QuoteStato =
    input.data.stato === 'definitivo' ? 'definitivo' : 'bozza';

  const { data: created, error } = await sb
    .from('quotes')
    .insert({
      ...idx,
      stato: initialStato,
      autore_id: input.autoreId,
    })
    .select('*')
    .single();

  if (error) throw error;
  const quote = created as QuoteRow;

  const version = await versionsRepo.create({
    quoteId: quote.id,
    data: input.data,
    totali: input.totali,
    autoreId: input.autoreId,
    label: 'v1',
  });

  const { data: linked, error: linkErr } = await sb
    .from('quotes')
    .update({ current_version_id: version.id })
    .eq('id', quote.id)
    .select('*')
    .single();

  if (linkErr) throw linkErr;
  return linked as QuoteRow;
}

/**
 * Salva una modifica: crea una nuova versione e aggiorna le colonne indicizzate
 * + il puntatore current_version_id. Optimistic concurrency tramite
 * `expectedUpdatedAt`: se diverso da quanto in DB, qualcun altro ha salvato.
 */
export async function saveNewVersion(input: {
  quoteId: string;
  data: Quote;
  totali: QuoteTotals;
  autoreId: string;
  label?: string;
  expectedUpdatedAt?: string;
}): Promise<QuoteRow> {
  const sb = requireSupabase();

  if (input.expectedUpdatedAt) {
    const current = await get(input.quoteId);
    if (current.updated_at !== input.expectedUpdatedAt) {
      const err = new Error('CONFLICT') as Error & { code?: string };
      err.code = 'CONFLICT';
      throw err;
    }
  }

  const version = await versionsRepo.create({
    quoteId: input.quoteId,
    data: input.data,
    totali: input.totali,
    autoreId: input.autoreId,
    label: input.label,
  });

  const idx = indexFields(input.data, input.totali);
  const { data: updated, error } = await sb
    .from('quotes')
    .update({ ...idx, current_version_id: version.id })
    .eq('id', input.quoteId)
    .select('*')
    .single();

  if (error) throw error;
  return updated as QuoteRow;
}

/**
 * Autosave: sovrascrive in place la versione corrente + aggiorna le colonne
 * indicizzate. NON crea una nuova versione (vedi saveNewVersion per gli
 * snapshot intenzionali). Optimistic concurrency tramite `expectedUpdatedAt`.
 * Ritorna il record aggiornato (con il nuovo updated_at).
 */
export async function autosave(input: {
  quoteId: string;
  currentVersionId: string;
  data: Quote;
  totali: QuoteTotals;
  expectedUpdatedAt?: string;
}): Promise<QuoteRow> {
  const sb = requireSupabase();

  if (input.expectedUpdatedAt) {
    const current = await get(input.quoteId);
    if (current.updated_at !== input.expectedUpdatedAt) {
      const err = new Error('CONFLICT') as Error & { code?: string };
      err.code = 'CONFLICT';
      throw err;
    }
  }

  await versionsRepo.updateData(input.currentVersionId, input.data, input.totali);

  const idx = indexFields(input.data, input.totali);
  const { data: updated, error } = await sb
    .from('quotes')
    .update(idx)
    .eq('id', input.quoteId)
    .select('*')
    .single();

  if (error) throw error;
  return updated as QuoteRow;
}

/** Cambia lo stato del preventivo (bozza → definitivo → inviato → archiviato). */
export async function setStato(id: string, stato: QuoteStato): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('quotes').update({ stato }).eq('id', id);
  if (error) throw error;
}

/** Archiviazione soft (gli operatori non possono cancellare definitivamente). */
export async function archive(id: string): Promise<void> {
  await setStato(id, 'archiviato');
}

/**
 * Duplica un preventivo: nuovo record (nuovo codice) con una copia della
 * versione corrente come v1. Ritorna il nuovo record.
 */
export async function duplicate(id: string, autoreId: string): Promise<QuoteRow> {
  const { version } = await getWithCurrentVersion(id);
  if (!version) throw new Error('Nessuna versione da duplicare per questo preventivo');
  return create({ data: version.data, totali: version.totali, autoreId });
}

/** Cancellazione definitiva (consentita a ogni utente autenticato via RLS). */
export async function remove(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('quotes').delete().eq('id', id);
  if (error) throw error;
}

// ---- Soft lock advisory (concorrenza minima) ------------------------------
export interface LockResult {
  /** True se l'utente possiede ora il lock. */
  acquired: boolean;
  /** Se non acquisito: id dell'utente che detiene il lock. */
  lockedBy: string | null;
  lockedAt: string | null;
}

const LOCK_STALE_MS = 15 * 60 * 1000; // lock advisory scaduto dopo 15 min

/**
 * Prova ad acquisire il lock advisory. Se è già di un altro utente (e non
 * scaduto) non lo sovrascrive, a meno di `force` (presa di controllo esplicita).
 */
export async function acquireLock(
  id: string,
  userId: string,
  force = false,
): Promise<LockResult> {
  const sb = requireSupabase();
  const current = await get(id);
  const stale =
    current.locked_at && Date.now() - new Date(current.locked_at).getTime() > LOCK_STALE_MS;

  if (!force && current.locked_by && current.locked_by !== userId && !stale) {
    return { acquired: false, lockedBy: current.locked_by, lockedAt: current.locked_at };
  }

  const { error } = await sb
    .from('quotes')
    .update({ locked_by: userId, locked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  return { acquired: true, lockedBy: userId, lockedAt: new Date().toISOString() };
}

/** Rinnova il timestamp del lock (heartbeat durante l'editing). */
export async function refreshLock(id: string, userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('quotes')
    .update({ locked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('locked_by', userId);
  if (error) throw error;
}

/** Rilascia il lock se posseduto dall'utente. */
export async function releaseLock(id: string, userId: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('quotes')
    .update({ locked_by: null, locked_at: null })
    .eq('id', id)
    .eq('locked_by', userId);
  if (error) throw error;
}
