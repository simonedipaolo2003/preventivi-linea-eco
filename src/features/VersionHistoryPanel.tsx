// ============================================================================
// VersionHistoryPanel — cronologia degli snapshot di un preventivo.
// Elenca le versioni salvate (intenzionali), permette di ripristinarne una nel
// foglio di lavoro e di creare un nuovo snapshot dallo stato corrente.
// ============================================================================
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { versionsRepo, profilesRepo } from '@/data/repositories';
import type { QuoteVersionRow } from '@/data/supabase/types';
import { formatEur } from '@/lib/money';

interface Props {
  open: boolean;
  onClose: () => void;
  quoteId: string | null;
  /** Crea uno snapshot dallo stato corrente. Risolve quando fatto. */
  onSnapshot: (label: string) => Promise<void>;
  /** Ripristina la versione selezionata nel foglio di lavoro. */
  onRestore: (version: QuoteVersionRow) => void;
}

export function VersionHistoryPanel({ open, onClose, quoteId, onSnapshot, onRestore }: Props) {
  const [versions, setVersions] = useState<QuoteVersionRow[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [snapping, setSnapping] = useState(false);

  useEffect(() => {
    if (!open || !quoteId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([versionsRepo.listByQuote(quoteId), profilesRepo.nameMap()])
      .then(([vs, nm]) => {
        if (cancelled) return;
        setVersions(vs);
        setNames(nm);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, quoteId]);

  const handleSnapshot = async () => {
    if (!quoteId) return;
    setSnapping(true);
    try {
      const label = `Snapshot ${new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      await onSnapshot(label);
      setVersions(await versionsRepo.listByQuote(quoteId));
    } finally {
      setSnapping(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 no-print">
          <motion.div
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-chalk shadow-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-line px-7 py-5">
              <div>
                <span className="label-eyebrow">Cronologia</span>
                <h2 className="font-serif text-xl text-ink">Versioni</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Chiudi"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              {!quoteId ? (
                <p className="text-sm italic text-ink-faint">
                  Salva il preventivo per iniziare a tracciarne le versioni.
                </p>
              ) : loading ? (
                <div className="flex justify-center py-10 text-ink-faint">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
                </div>
              ) : versions.length === 0 ? (
                <p className="text-sm italic text-ink-faint">Nessuno snapshot salvato.</p>
              ) : (
                <ul className="space-y-3">
                  {versions.map((v) => (
                    <li
                      key={v.id}
                      className="group rounded-xl2 border border-line bg-paper p-4 shadow-soft"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-serif text-sm text-ink">
                          v{v.version_no} · {v.label}
                        </span>
                        <span className="tnum text-xs text-ink-muted">
                          {formatEur(v.totali.prezzoPrivatiFinale)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-2xs text-ink-faint">
                        <span>
                          {names.get(v.autore_id) ?? '—'} ·{' '}
                          {new Date(v.created_at).toLocaleString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          onClick={() => onRestore(v)}
                          className="rounded-md px-2 py-1 text-xs text-ink-muted opacity-0 transition-all hover:bg-stone-100 hover:text-accent group-hover:opacity-100"
                        >
                          Ripristina
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-line px-7 py-4">
              <button
                onClick={handleSnapshot}
                disabled={!quoteId || snapping}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {snapping && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
                )}
                Salva snapshot versione
              </button>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
