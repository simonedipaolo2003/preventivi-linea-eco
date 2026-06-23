// ============================================================================
// ArchivioPage — elenco condiviso dei preventivi.
// Ricerca (cliente/riferimento/codice), filtro stato, ordinamento; azioni
// apri / duplica / archivia / elimina (tutte disponibili a ogni utente).
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/app/TopBar';
import { useAuth } from '@/auth/AuthProvider';
import { quotesRepo, exportsRepo } from '@/data/repositories';
import type { ArchiveFilters, SortKey } from '@/data/repositories/quotesRepo';
import type { QuoteListItem, QuoteStato } from '@/data/supabase/types';
import { SegmentToggle } from '@/components/primitives';
import { useToast } from '@/components/Toast';
import { formatEur } from '@/lib/money';

const STATI: { value: QuoteStato | 'tutti'; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'bozza', label: 'Bozze' },
  { value: 'definitivo', label: 'Definitivi' },
  { value: 'inviato', label: 'Inviati' },
  { value: 'archiviato', label: 'Archiviati' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Ultima modifica' },
  { value: 'created', label: 'Creazione' },
  { value: 'cliente', label: 'Cliente' },
  { value: 'totale', label: 'Totale' },
];

export function ArchivioPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [stato, setStato] = useState<QuoteStato | 'tutti'>('tutti');
  const [sort, setSort] = useState<SortKey>('updated');
  const [items, setItems] = useState<QuoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filters: ArchiveFilters) => {
    setLoading(true);
    setError(null);
    try {
      setItems(await quotesRepo.list(filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ricarica al cambio di stato/sort; la ricerca testuale è debounced.
  useEffect(() => {
    const t = setTimeout(() => {
      load({ search, stato, sort, ascending: sort === 'cliente' });
    }, 250);
    return () => clearTimeout(t);
  }, [search, stato, sort, load]);

  const reload = () => load({ search, stato, sort, ascending: sort === 'cliente' });

  const handleDuplicate = async (id: string) => {
    if (!profile) return;
    try {
      const created = await quotesRepo.duplicate(id, profile.id);
      toast.success('Preventivo duplicato.');
      navigate(`/preventivo/${created.id}`);
    } catch {
      toast.error('Impossibile duplicare il preventivo.');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await quotesRepo.archive(id);
      toast.success('Preventivo archiviato.');
      reload();
    } catch {
      toast.error('Impossibile archiviare il preventivo.');
    }
  };

  const handleDelete = async (id: string, codice: string) => {
    if (!window.confirm(`Eliminare definitivamente ${codice}? Operazione irreversibile.`)) return;
    try {
      await quotesRepo.remove(id);
      toast.success(`${codice} eliminato.`);
      reload();
    } catch {
      toast.error('Eliminazione non riuscita. Riprova.');
    }
  };

  const handleOpenPdf = async (quoteId: string) => {
    try {
      const exports = await exportsRepo.listByQuote(quoteId);
      if (exports.length === 0) {
        toast.error('Nessun PDF associato a questo preventivo.');
        return;
      }
      const url = await exportsRepo.signedUrl(exports[0].storage_path);
      window.open(url, '_blank', 'noopener');
    } catch {
      toast.error('Impossibile aprire il PDF.');
    }
  };

  return (
    <div className="min-h-screen">
      <TopBar />

      <main className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <div className="mb-8 flex items-baseline justify-between">
          <h1 className="font-serif text-3xl text-ink">Archivio preventivi</h1>
          <button
            onClick={() => navigate('/preventivo/nuovo')}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
          >
            + Nuovo preventivo
          </button>
        </div>

        {/* Toolbar filtri */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per cliente, riferimento o codice…"
            className="field-input-boxed max-w-xs flex-1"
          />
          <SegmentToggle value={stato} options={STATI} onChange={setStato} />
          <div className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
            <span className="uppercase tracking-label">Ordina</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-20 text-ink-faint">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-sm italic text-ink-faint">
            Nessun preventivo trovato.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl2 border border-line bg-paper shadow-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-2xs uppercase tracking-label text-ink-faint">
                  <th className="px-4 py-3 font-medium">Codice</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Riferimento</th>
                  <th className="px-4 py-3 font-medium">Autore</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">Aggiornato</th>
                  <th className="px-4 py-3 text-right font-medium">Totale</th>
                  <th className="px-4 py-3 text-center font-medium">PDF</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr
                    key={q.id}
                    className="group/row cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-stone-50"
                    onClick={() => navigate(`/preventivo/${q.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">{q.codice}</td>
                    <td className="px-4 py-3 text-ink">{q.cliente || '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{q.riferimento || '—'}</td>
                    <td className="px-4 py-3 text-ink-muted">{q.autore_nome}</td>
                    <td className="px-4 py-3">
                      <StatoBadge stato={q.stato} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{formatDate(q.updated_at)}</td>
                    <td className="tnum px-4 py-3 text-right text-ink">
                      {formatEur(q.totale_finale)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {q.has_pdf ? (
                        <button
                          onClick={() => handleOpenPdf(q.id)}
                          title="Apri ultimo PDF"
                          className="text-accent transition-opacity hover:opacity-70"
                        >
                          ●
                        </button>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                        <RowAction label="Modifica" onClick={() => navigate(`/preventivo/${q.id}`)} />
                        <RowAction label="Duplica" onClick={() => handleDuplicate(q.id)} />
                        {q.stato !== 'archiviato' && (
                          <RowAction label="Archivia" onClick={() => handleArchive(q.id)} />
                        )}
                        <RowAction
                          label="Elimina"
                          danger
                          onClick={() => handleDelete(q.id, q.codice)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function RowAction({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50'
          : 'text-ink-muted hover:bg-stone-100 hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function StatoBadge({ stato }: { stato: QuoteStato }) {
  const map: Record<QuoteStato, string> = {
    bozza: 'bg-stone-100 text-ink-muted',
    definitivo: 'bg-accent/10 text-accent',
    inviato: 'bg-sky-50 text-sky-600',
    archiviato: 'bg-stone-100 text-ink-faint',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-2xs uppercase tracking-label ${map[stato]}`}>
      {stato}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
