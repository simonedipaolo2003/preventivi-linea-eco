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

  async function run(): Promise<AutosaveStatus> {
    if (running.current) return 'saving';
    const uid = latest.current.autoreId;
    if (!uid) return 'idle';

    running.current = true;
    setStatus('saving');
    try {
      // `rec` è gestito localmente: dopo la create punta al nuovo record, così
      // il ciclo non ricrea il preventivo e usa updated_at aggiornato.
      let rec = latest.current.record;
      for (;;) {
        const revAtStart = useQuoteStore.getState().rev;
        const q = useQuoteStore.getState().quote;
        const p = useQuoteStore.getState().params;
        const totali = calcQuote(q, p);

        if (!rec) {
          // Niente record vuoti: serve almeno l'intestazione cliente.
          if (!q.header.intestazioneCliente.trim()) {
            setStatus('idle');
            return 'idle';
          }
          const created = await quotesRepo.create({ data: q, totali, autoreId: uid });
          rec = {
            id: created.id,
            codice: created.codice,
            versionId: created.current_version_id,
            updatedAt: created.updated_at,
            stato: created.stato,
          };
          markSaved(rec, revAtStart);
          onCreated?.(created.id);
        } else if (rec.versionId) {
          const updated = await quotesRepo.autosave({
            quoteId: rec.id,
            currentVersionId: rec.versionId,
            data: q,
            totali,
            expectedUpdatedAt: rec.updatedAt,
          });
          rec = {
            id: updated.id,
            codice: updated.codice,
            versionId: updated.current_version_id,
            updatedAt: updated.updated_at,
            stato: updated.stato,
          };
          markSaved(rec, revAtStart);
        } else {
          break;
        }

        // Se il contenuto è cambiato durante il salvataggio, salva di nuovo con
        // i dati freschi (e il nuovo updated_at) invece di perdere le modifiche.
        if (useQuoteStore.getState().rev === revAtStart) break;
      }

      setStatus('saved');
      setSavedAt(new Date());
      return 'saved';
    } catch (err) {
      const result: AutosaveStatus =
        (err as { code?: string }).code === 'CONFLICT' ? 'conflict' : 'error';
      setStatus(result);
      return result;
    } finally {
      running.current = false;
    }
  }

  /** Forza un salvataggio immediato (es. prima di uscire, o dal pulsante Salva). */
  function flush(): Promise<AutosaveStatus> {
    if (timer.current) clearTimeout(timer.current);
    return run();
  }

  return { status, savedAt, flush };
}
