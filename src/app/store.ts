// ============================================================================
// Store dell'editor — stato di lavoro in memoria (NON più persistito in
// localStorage: la fonte di verità è il database condiviso).
//
// Tiene il preventivo in editing, i parametri di pricing e i metadati del
// record DB caricato (id/codice/updated_at/stato) per save e concorrenza.
// ============================================================================
import { create } from 'zustand';
import type { PricingParams, Quote } from '@/domain/types';
import { DEFAULT_PRICING_PARAMS } from '@/data/params';
import { createEmptyQuote } from '@/domain/quoteFactory';

type Updater<T> = (draft: T) => void;

/** Metadati del record DB attualmente in editing (null = nuovo, non salvato). */
export interface LoadedRecord {
  id: string;
  codice: string;
  /** Versione corrente puntata dal record (target dell'autosave in place). */
  versionId: string | null;
  /** updated_at del record, per optimistic concurrency. */
  updatedAt: string;
  stato: string;
}

interface QuoteStore {
  quote: Quote;
  params: PricingParams;
  /** Record DB collegato (null finché non salvato la prima volta). */
  record: LoadedRecord | null;
  /** True se ci sono modifiche non ancora salvate sul server. */
  dirty: boolean;
  /**
   * Contatore che aumenta a ogni modifica del contenuto. L'autosave cattura il
   * valore all'inizio del salvataggio e, a fine, azzera `dirty` SOLO se non è
   * cambiato nel frattempo: così le battiture fatte durante il salvataggio non
   * vengono perse (né lo stato "salvato" mostrato in modo ingannevole).
   */
  rev: number;

  updateQuote: (fn: Updater<Quote>) => void;
  setQuote: (quote: Quote) => void;
  /** Reset a un preventivo vuoto (nuovo, scollegato dal DB). */
  resetQuote: () => void;
  /** Carica un preventivo dal DB insieme ai suoi metadati. */
  loadQuote: (quote: Quote, record: LoadedRecord) => void;
  /** Segna lo stato salvato: `dirty` diventa false solo se rev == savedRev. */
  markSaved: (record: LoadedRecord, savedRev?: number) => void;
  /** Aggiorna parzialmente i metadati del record (es. stato lifecycle). */
  patchRecord: (patch: Partial<LoadedRecord>) => void;

  updateParams: (fn: Updater<PricingParams>) => void;
  resetParams: () => void;
}

/** Applica la mutazione su un clone profondo per mantenere immutabilità. */
function produce<T>(state: T, fn: Updater<T>): T {
  const draft = structuredClone(state);
  fn(draft);
  return draft;
}

export const useQuoteStore = create<QuoteStore>()((set) => ({
  quote: createEmptyQuote(),
  params: DEFAULT_PRICING_PARAMS,
  record: null,
  dirty: false,
  rev: 0,

  updateQuote: (fn) => set((s) => ({ quote: produce(s.quote, fn), dirty: true, rev: s.rev + 1 })),
  setQuote: (quote) => set((s) => ({ quote, dirty: true, rev: s.rev + 1 })),
  resetQuote: () =>
    set((s) => ({ quote: createEmptyQuote(), record: null, dirty: false, rev: s.rev + 1 })),
  loadQuote: (quote, record) => set((s) => ({ quote, record, dirty: false, rev: s.rev + 1 })),
  // Aggiorna solo i metadati del record: lo stato lifecycle (quotes.stato) è
  // gestito esplicitamente, non sovrascritto dal salvataggio del corpo.
  // dirty resta true se il contenuto è cambiato dopo l'inizio del salvataggio.
  markSaved: (record, savedRev) =>
    set((s) => ({ record, dirty: savedRev !== undefined && s.rev !== savedRev })),
  patchRecord: (patch) =>
    set((s) => (s.record ? { record: { ...s.record, ...patch } } : {})),

  updateParams: (fn) => set((s) => ({ params: produce(s.params, fn), rev: s.rev + 1 })),
  resetParams: () => set({ params: DEFAULT_PRICING_PARAMS }),
}));
