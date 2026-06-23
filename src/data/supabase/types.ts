// ============================================================================
// Tipi delle righe del database (rispecchiano lo schema SQL).
// Tenuti separati dai tipi di dominio (`@/domain/types`): il corpo del
// preventivo viaggia in `quote_versions.data` come oggetto `Quote`.
// ============================================================================
import type { Quote, QuoteTotals } from '@/domain/types';

export type UserRole = 'admin' | 'operatore';
export type QuoteStato = 'bozza' | 'definitivo' | 'inviato' | 'archiviato';

export interface ProfileRow {
  id: string;
  display_name: string;
  role: UserRole;
  created_at: string;
}

export interface QuoteRow {
  id: string;
  codice: string;
  cliente: string;
  riferimento: string;
  focolare: string;
  stato: QuoteStato;
  totale_finale: number;
  autore_id: string;
  current_version_id: string | null;
  has_pdf: boolean;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteVersionRow {
  id: string;
  quote_id: string;
  version_no: number;
  label: string;
  data: Quote;
  totali: QuoteTotals;
  autore_id: string;
  created_at: string;
}

export interface QuoteExportRow {
  id: string;
  quote_id: string;
  version_id: string | null;
  storage_path: string;
  modalita: 'cliente' | 'interna';
  autore_id: string;
  created_at: string;
}

/** Riga arricchita per l'archivio (join con autore + ultima versione). */
export interface QuoteListItem extends QuoteRow {
  autore_nome: string;
}
