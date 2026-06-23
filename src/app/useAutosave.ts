// ============================================================================
// useAutosave — salvataggio automatico con debounce.
//
// Salva IN PLACE la versione corrente (nessuna nuova versione per battitura;
// gli snapshot intenzionali si fanno con "Salva versione"). Per un preventivo
// nuovo crea il record al primo contenuto significativo (cliente compilato).
// In caso di conflitto si mette in pausa finché il chiamante non ricarica.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { calcQuote } from '@/domain/pricing/engine';
import { quotesRepo } from '@/data/repositories';
import { useQuoteStore } from './store';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error';

interface Options {
  autoreId: string | undefined;
  /** Chiamata quando l'autosave crea per la prima volta il record (nuovo → id). */
  onCreated?: (id: string) => void;
  /** Sospende l'autosave (es. dopo un conflitto, in attesa del reload). */
  paused?: boolean;
  delay?: number;
}

export function useAutosave({ autoreId, onCreated, paused = false, delay = 1200 }: Options) {
  const quote = useQuoteStore((s) => s.quote);
  const params = useQuoteStore((s) => s.params);
  const record = useQuoteStore((s) => s.record);
  const dirty = useQuoteStore((s) => s.dirty);
  const markSaved = useQuoteStore((s) => s.markSaved);

  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = useRef(false);

  // Snapshot sempre aggiornato dei valori, per il salvataggio differito.
  const latest = useRef({ quote, params, record, autoreId });
  latest.current = { quote, params, record, autoreId };

  useEffect(() => {
    if (paused || !dirty || !autoreId) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(run, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, dirty, paused, autoreId, delay]);

  async function run() {
    if (running.current) return;
    const { quote: q, params: p, record: r, autoreId: uid } = latest.current;
    if (!uid) return;

    const totali = calcQuote(q, p);
    running.current = true;
    setStatus('saving');
    try {
      if (!r) {
        // Niente record vuoti: serve almeno l'intestazione cliente.
        if (!q.header.intestazioneCliente.trim()) {
          setStatus('idle');
          return;
        }
        const created = await quotesRepo.create({ data: q, totali, autoreId: uid });
        markSaved({
          id: created.id,
          codice: created.codice,
          versionId: created.current_version_id,
          updatedAt: created.updated_at,
          stato: created.stato,
        });
        onCreated?.(created.id);
      } else if (r.versionId) {
        const updated = await quotesRepo.autosave({
          quoteId: r.id,
          currentVersionId: r.versionId,
          data: q,
          totali,
          expectedUpdatedAt: r.updatedAt,
        });
        markSaved({
          id: updated.id,
          codice: updated.codice,
          versionId: updated.current_version_id,
          updatedAt: updated.updated_at,
          stato: updated.stato,
        });
      }
      setStatus('saved');
      setSavedAt(new Date());
    } catch (err) {
      setStatus((err as { code?: string }).code === 'CONFLICT' ? 'conflict' : 'error');
    } finally {
      running.current = false;
    }
  }

  /** Forza un salvataggio immediato (es. prima di uscire). */
  function flush() {
    if (timer.current) clearTimeout(timer.current);
    return run();
  }

  return { status, savedAt, flush };
}
