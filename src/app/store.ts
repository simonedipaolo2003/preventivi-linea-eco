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

  updateQuote: (fn: Updater<Quote>) => void;
  setQuote: (quote: Quote) => void;
  /** Reset a un preventivo vuoto (nuovo, scollegato dal DB). */
  resetQuote: () => void;
  /** Carica un preventivo dal DB insieme ai suoi metadati. */
  loadQuote: (quote: Quote, record: LoadedRecord) => void;
  /** Segna lo stato salvato aggiornando i metadati del record. */
  markSaved: (record: LoadedRecord) => void;
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

  updateQuote: (fn) => set((s) => ({ quote: produce(s.quote, fn), dirty: true })),
  setQuote: (quote) => set({ quote, dirty: true }),
  resetQuote: () => set({ quote: createEmptyQuote(), record: null, dirty: false }),
  loadQuote: (quote, record) => set({ quote, record, dirty: false }),
  // Aggiorna solo i metadati del record: lo stato lifecycle (quotes.stato) è
  // gestito esplicitamente, non sovrascritto dal salvataggio del corpo.
  markSaved: (record) => set({ record, dirty: false }),
  patchRecord: (patch) =>
    set((s) => (s.record ? { record: { ...s.record, ...patch } } : {})),

  updateParams: (fn) => set((s) => ({ params: produce(s.params, fn) })),
  resetParams: () => set({ params: DEFAULT_PRICING_PARAMS }),
}));
