// ============================================================================
// EditorPage — compilazione/anteprima di un preventivo (multiutente).
// /preventivo/nuovo  → nuovo preventivo (record creato al primo contenuto)
// /preventivo/:id    → carica la versione corrente dal DB
//
// Salvataggio: autosave con debounce (in place sulla versione corrente).
// Concorrenza: soft lock advisory + avviso conflitti (updated_at).
// Cronologia: snapshot di versione su richiesta + ripristino.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { TopBar } from '@/app/TopBar';
import { SectionNav } from '@/app/SectionNav';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { useAutosave } from '@/app/useAutosave';
import { useAuth } from '@/auth/AuthProvider';
import { SummaryPanel } from '@/features/SummaryPanel';
import { AnagraficaSection } from '@/features/AnagraficaSection';
import { MaterialiSection } from '@/features/MaterialiSection';
import { SupportiSection } from '@/features/SupportiSection';
import { LegnoSection } from '@/features/LegnoSection';
import { LavorazioniSection } from '@/features/LavorazioniSection';
import { ManodoperaSection } from '@/features/ManodoperaSection';
import { RiepilogoSection } from '@/features/RiepilogoSection';
import { SchedaClienteSection } from '@/features/SchedaClienteSection';
import { OutputView } from '@/features/OutputView';
import { ParametriPanel } from '@/features/ParametriPanel';
import { VersionHistoryPanel } from '@/features/VersionHistoryPanel';
import { SegmentToggle } from '@/components/primitives';
import { useToast } from '@/components/Toast';
import { quotesRepo, profilesRepo } from '@/data/repositories';
import type { QuoteVersionRow } from '@/data/supabase/types';

type View = 'compilazione' | 'anteprima';
const LOCK_REFRESH_MS = 5 * 60 * 1000;

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  const [view, setView] = useState<View>('compilazione');
  const [paramsOpen, setParamsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  const quote = useQuoteStore((s) => s.quote);
  const record = useQuoteStore((s) => s.record);
  const dirty = useQuoteStore((s) => s.dirty);
  const setQuote = useQuoteStore((s) => s.setQuote);
  const resetQuote = useQuoteStore((s) => s.resetQuote);
  const loadQuote = useQuoteStore((s) => s.loadQuote);
  const totals = useTotals();

  const autosave = useAutosave({
    autoreId: profile?.id,
    paused: conflict,
    onCreated: (newId) => navigate(`/preventivo/${newId}`, { replace: true }),
  });

  // ---- Caricamento / inizializzazione --------------------------------------
  const loadFromDb = useCallback(
    async (quoteId: string) => {
      const { quote: row, version } = await quotesRepo.getWithCurrentVersion(quoteId);
      if (!version) {
        // Il preventivo esiste ma non ha alcuna versione (corpo) recuperabile.
        const err = new Error('NO_VERSION') as Error & { code?: string };
        err.code = 'NO_VERSION';
        throw err;
      }
      loadQuote(version.data, {
        id: row.id,
        codice: row.codice,
        // La versione caricata è la fonte di verità del corpo: usiamo il suo id
        // come target dell'autosave (current_version_id può essere stato riparato).
        versionId: version.id,
        updatedAt: row.updated_at,
        stato: row.stato,
      });
      return row;
    },
    [loadQuote],
  );

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      resetQuote();
      setLoadError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    loadFromDb(id)
      .catch((err: unknown) => {
        if (cancelled) return;
        // Errore visibile (non più ingoiato): aiuta a distinguere "nessuna
        // versione" da un errore di rete/permessi.
        // eslint-disable-next-line no-console
        console.error('Caricamento preventivo fallito:', err);
        setLoadError(
          (err as { code?: string }).code === 'NO_VERSION'
            ? 'Questo preventivo non ha un contenuto salvato da mostrare.'
            : 'Errore nel caricamento del preventivo.',
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, loadFromDb, resetQuote]);

  // ---- Soft lock advisory: acquire on open, refresh, release on leave ------
  useEffect(() => {
    if (!id || !profile) return;
    let active = true;

    quotesRepo.acquireLock(id, profile.id).then(async (res) => {
      if (!active) return;
      if (!res.acquired && res.lockedBy) {
        const names = await profilesRepo.nameMap();
        if (active) setLockedBy(names.get(res.lockedBy) ?? 'un altro utente');
      } else {
        setLockedBy(null);
      }
    });

    const interval = setInterval(() => {
      quotesRepo.refreshLock(id, profile.id).catch(() => undefined);
    }, LOCK_REFRESH_MS);

    return () => {
      active = false;
      clearInterval(interval);
      quotesRepo.releaseLock(id, profile.id).catch(() => undefined);
    };
  }, [id, profile]);

  // Conflitto rilevato dall'autosave → mostra banner.
  useEffect(() => {
    if (autosave.status === 'conflict') setConflict(true);
  }, [autosave.status]);

  // ---- Azioni --------------------------------------------------------------
  const handleReload = async () => {
    if (!id) return;
    await loadFromDb(id);
    setConflict(false);
  };

  const handleManualSave = async () => {
    const result = await autosave.flush();
    if (result === 'saved') {
      toast.success('Preventivo salvato.');
    } else if (result === 'idle') {
      toast.error('Inserisci il nome del cliente prima di salvare.');
    } else if (result === 'error') {
      toast.error('Salvataggio non riuscito. Riprova.');
    }
    // 'conflict' → il banner di conflitto scatta già dall'effect che osserva autosave.status.
  };

  const handleTakeOver = async () => {
    if (!id || !profile) return;
    try {
      await quotesRepo.acquireLock(id, profile.id, true);
      setLockedBy(null);
      toast.success('Hai preso il controllo del preventivo.');
    } catch {
      toast.error('Impossibile prendere il controllo.');
    }
  };

  const handleSnapshot = async (label: string) => {
    if (!record || !profile) return;
    try {
      await quotesRepo.saveNewVersion({
        quoteId: record.id,
        data: quote,
        totali: totals,
        autoreId: profile.id,
        label,
      });
      // saveNewVersion sposta current_version_id: riallinea i metadati locali.
      await loadFromDb(record.id);
      toast.success('Snapshot di versione salvato.');
    } catch {
      toast.error('Impossibile salvare lo snapshot.');
    }
  };

  const handleRestore = (version: QuoteVersionRow) => {
    setQuote(version.data);
    setHistoryOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-faint">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-xl2 border border-line bg-paper p-8 text-center shadow-soft">
          <h1 className="font-serif text-xl text-ink">Impossibile aprire il preventivo</h1>
          <p className="mt-3 text-sm text-ink-muted">{loadError}</p>
          <button
            onClick={() => navigate('/archivio')}
            className="mt-6 rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            Torna all’archivio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar
        actions={
          <>
            <SegmentToggle
              value={view}
              options={[
                { value: 'compilazione', label: 'Compilazione' },
                { value: 'anteprima', label: 'Anteprima' },
              ]}
              onChange={setView}
            />
            <SaveIndicator status={autosave.status} dirty={dirty} savedAt={autosave.savedAt} />
            <button
              onClick={handleManualSave}
              disabled={autosave.status === 'saving'}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {autosave.status === 'saving' && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
              )}
              Salva
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              aria-label="Cronologia versioni"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M3 3v5h5" />
                <path d="M3.05 13A9 9 0 106 5.3L3 8" />
                <path d="M12 7v5l4 2" />
              </svg>
            </button>
            <button
              onClick={() => setParamsOpen(true)}
              aria-label="Parametri"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-stone-100 hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
          </>
        }
      />

      {/* Avvisi concorrenza */}
      {lockedBy && (
        <Banner tone="warn">
          <span>
            Questo preventivo è in modifica da <strong>{lockedBy}</strong>. Le modifiche
            potrebbero sovrapporsi.
          </span>
          <button onClick={handleTakeOver} className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium transition-colors hover:bg-paper/60">
            Prendi il controllo
          </button>
        </Banner>
      )}
      {conflict && (
        <Banner tone="error">
          <span>
            Un’altra persona ha salvato nel frattempo. Ricarica per non sovrascrivere il suo
            lavoro.
          </span>
          <button onClick={handleReload} className="shrink-0 rounded-full border border-black/15 px-3 py-1 text-xs font-medium transition-colors hover:bg-paper/60">
            Ricarica versione aggiornata
          </button>
        </Banner>
      )}

      <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        {record && (
          <p className="no-print mb-4 text-xs uppercase tracking-label text-ink-faint">
            {record.codice}
          </p>
        )}
        {view === 'compilazione' ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 gap-12 lg:grid-cols-[180px_minmax(0,1fr)_300px]"
          >
            <div className="no-print hidden lg:block">
              <div className="sticky top-24">
                <SectionNav />
                <button
                  onClick={() => navigate('/archivio')}
                  className="mt-8 px-3 text-xs text-ink-faint transition-colors hover:text-accent"
                >
                  ← Torna all’archivio
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-16">
              <AnagraficaSection />
              <MaterialiSection />
              <SupportiSection />
              <LegnoSection />
              <LavorazioniSection />
              <ManodoperaSection />
              <RiepilogoSection />
              <SchedaClienteSection />
            </div>

            <div className="no-print hidden lg:block">
              <div className="sticky top-24 rounded-xl2 border border-line bg-paper p-6 shadow-soft">
                <SummaryPanel />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="output"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <OutputView />
          </motion.div>
        )}
      </main>

      <ParametriPanel open={paramsOpen} onClose={() => setParamsOpen(false)} />
      <VersionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        quoteId={record?.id ?? null}
        onSnapshot={handleSnapshot}
        onRestore={handleRestore}
      />
    </div>
  );
}

// ---- Indicatore stato autosave --------------------------------------------
function SaveIndicator({
  status,
  dirty,
  savedAt,
}: {
  status: ReturnType<typeof useAutosave>['status'];
  dirty: boolean;
  savedAt: Date | null;
}) {
  let label: string;
  let dot: string;

  if (status === 'saving') {
    label = 'Salvataggio…';
    dot = 'bg-amber-400';
  } else if (status === 'conflict') {
    label = 'Conflitto';
    dot = 'bg-red-500';
  } else if (status === 'error') {
    label = 'Errore salvataggio';
    dot = 'bg-red-500';
  } else if (dirty) {
    label = 'Modifiche non salvate';
    dot = 'bg-amber-400';
  } else if (savedAt) {
    label = `Salvato ${savedAt.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    dot = 'bg-emerald-500';
  } else {
    label = 'Tutto salvato';
    dot = 'bg-emerald-500';
  }

  return (
    <span className="hidden items-center gap-2 text-xs text-ink-muted sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ---- Banner avvisi ---------------------------------------------------------
function Banner({
  tone,
  children,
}: {
  tone: 'warn' | 'error';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`no-print border-b ${cls}`}>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-2.5 text-sm lg:px-10">
        {children}
      </div>
    </div>
  );
}
