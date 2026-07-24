import { useMemo, useRef, useState } from 'react';
import { SegmentToggle } from '@/components/primitives';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { useAuth } from '@/auth/AuthProvider';
import { formatEur, formatEur0 } from '@/lib/money';
import { buildPreview } from '@/domain/preview/presenter';
import type { PreviewBlock, PreviewMode, PreviewRow } from '@/domain/preview/presenter';
import { SchedaClienteView } from '@/features/SchedaClienteView';
import { elementToPdfBlob, pdfFilename, pickPdfTarget, writePdfTarget } from '@/lib/pdf';
import { exportsRepo } from '@/data/repositories';

type ArchiveState = 'idle' | 'working' | 'done' | 'error';
/** Le due anteprime tecniche esistenti + la brochure "Scheda cliente". */
type OutputMode = PreviewMode | 'scheda';

export function OutputView() {
  const [mode, setMode] = useState<OutputMode>('interna');
  const [printing, setPrinting] = useState(false);
  const [archiveState, setArchiveState] = useState<ArchiveState>('idle');
  const [archiveMsg, setArchiveMsg] = useState<string | null>(null);
  const docRef = useRef<HTMLElement>(null);
  const quote = useQuoteStore((s) => s.quote);
  const params = useQuoteStore((s) => s.params);
  const record = useQuoteStore((s) => s.record);
  const dirty = useQuoteStore((s) => s.dirty);
  const totals = useTotals();
  const { profile } = useAuth();

  // Per la scheda il presenter non serve al layout, ma fornisce i metadata
  // (cliente/data) usati nel nome file.
  const previewMode: PreviewMode = mode === 'scheda' ? 'cliente' : mode;
  const model = useMemo(
    () => buildPreview(quote, params, totals, previewMode),
    [quote, params, totals, previewMode],
  );

  const handlePrint = () => {
    setPrinting(true);
    const prevTitle = document.title;
    document.title = pdfFilename(model.metadata.cliente, model.metadata.data).replace(/\.pdf$/, '');
    const restore = () => {
      document.title = prevTitle;
      setPrinting(false);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => setPrinting(false), 1200);
    window.print();
  };

  const handleArchive = async () => {
    if (!docRef.current || !profile) return;
    if (!record) {
      setArchiveState('error');
      setArchiveMsg('Salva prima il preventivo, poi potrai archiviare il PDF.');
      return;
    }

    // Chiedi il percorso SUBITO, finché il click è "fresco": showSaveFilePicker
    // richiede un gesto utente recente, quindi va invocato prima della
    // generazione del PDF (html2canvas + upload consumerebbero l'attivazione).
    const filename = pdfFilename(model.metadata.cliente, model.metadata.data, mode);
    let target;
    try {
      target = await pickPdfTarget(filename);
    } catch {
      setArchiveState('error');
      setArchiveMsg('Impossibile aprire la finestra di salvataggio.');
      return;
    }
    if (target === null) return; // annullato dall'utente

    setArchiveState('working');
    setArchiveMsg(null);
    try {
      const blob = await elementToPdfBlob(docRef.current);
      await exportsRepo.upload({
        quoteId: record.id,
        versionId: record.versionId,
        blob,
        modalita: mode,
        autoreId: profile.id,
      });
      await writePdfTarget(target, blob, filename);
      setArchiveState('done');
      setArchiveMsg('PDF salvato nell’archivio e sul computer.');
      setTimeout(() => setArchiveState('idle'), 3000);
    } catch {
      setArchiveState('error');
      setArchiveMsg('Errore durante la generazione/salvataggio del PDF.');
    }
  };

  const m = model.metadata;
  const isClient = mode === 'cliente';
  const blocks = model.blocks.filter((b) => (isClient ? b.showInClient : true));

  return (
    <div>
      {/* Toolbar — non stampata */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentToggle
          value={mode}
          options={[
            { value: 'interna', label: 'Anteprima interna' },
            { value: 'cliente', label: 'Anteprima cliente' },
            { value: 'scheda', label: 'Scheda cliente' },
          ]}
          onChange={setMode}
        />
        <div className="flex items-center gap-3">
          {archiveMsg && (
            <span
              className={`text-xs ${
                archiveState === 'error' ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {archiveMsg}
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={printing}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:border-stone-300 disabled:opacity-60"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" />
            </svg>
            {printing ? 'Stampa…' : 'Stampa'}
          </button>
          <button
            onClick={handleArchive}
            disabled={archiveState === 'working'}
            title={dirty ? 'Ci sono modifiche non ancora salvate' : undefined}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-chalk transition-colors hover:bg-ink-soft disabled:opacity-60"
          >
            {archiveState === 'working' ? (
              <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            )}
            {archiveState === 'working' ? 'Generazione…' : 'Salva PDF in archivio'}
          </button>
        </div>
      </div>

      {/* Documento A4 */}
      <article
        ref={docRef}
        className="print-page mx-auto max-w-3xl rounded-sm bg-paper px-12 py-12 shadow-panel print:max-w-none print:px-0 print:py-0 print:shadow-none"
      >
        {mode === 'scheda' ? (
          <SchedaClienteView quote={quote} />
        ) : (
          <>
        {/* Intestazione */}
        <header className="mb-9 flex items-start justify-between gap-8 border-b border-ink/10 pb-7">
          <div>
            <p className="label-eyebrow">Preventivo{isClient ? '' : ' · uso interno'}</p>
            <h1 className="mt-1.5 font-serif text-[2rem] leading-tight text-ink">{m.cliente || 'Cliente'}</h1>
            <p className="mt-2 text-sm text-ink-muted">
              {m.focolare && <>Focolare {m.focolare} · </>}Versione {m.versione || '1'}
            </p>
          </div>
          <div className="shrink-0 text-right text-sm text-ink-muted">
            <p className="tnum">{m.data}</p>
            {m.riferimento && <p>Rif. {m.riferimento}</p>}
            {m.venditore && <p>{m.venditore}</p>}
            <p className="mt-2 text-2xs uppercase tracking-label text-ink-faint">
              {m.stato === 'definitivo' ? 'Definitivo' : 'Bozza'}
            </p>
          </div>
        </header>

        {m.richiesteParticolari && (
          <div className="mb-8 break-inside-avoid">
            <p className="label-eyebrow mb-1.5">Richieste particolari</p>
            <p className="text-sm leading-relaxed text-ink-soft">{m.richiesteParticolari}</p>
          </div>
        )}

        {/* Blocchi */}
        <div className="space-y-9">
          {blocks.map((b) => (
            <Block key={b.id} block={b} isClient={isClient} />
          ))}
        </div>

        {/* Totali finali */}
        {isClient ? (
          <ClientTotal value={model.totals.prezzoPrivatiFinale} />
        ) : (
          <InternalTotals totals={model.totals} />
        )}
          </>
        )}
      </article>
    </div>
  );
}

// ---- Blocco di sezione -----------------------------------------------------

function Block({ block, isClient }: { block: PreviewBlock; isClient: boolean }) {
  const rows = isClient ? block.rows.filter((r) => r.showInClient) : block.rows;
  if (rows.length === 0) return null;

  return (
    <section className="break-inside-avoid">
      <div
        className={`mb-2.5 grid items-baseline gap-3 border-b border-ink/10 pb-2 ${
          isClient ? 'grid-cols-[1fr_120px]' : 'grid-cols-[1fr_92px_110px_110px]'
        }`}
      >
        <h2 className="font-serif text-lg text-ink">{block.title}</h2>
        {isClient ? (
          <span className="label-eyebrow text-right">Importo</span>
        ) : (
          <>
            <span className="label-eyebrow text-right">Costo</span>
            <span className="label-eyebrow text-right">Listino</span>
            <span className="label-eyebrow text-right">Privati</span>
          </>
        )}
      </div>

      <div>
        {rows.map((r, i) => (
          <Row key={i} row={r} isClient={isClient} />
        ))}
      </div>

      {!isClient && block.subtotal && (
        <div className="mt-1.5 grid grid-cols-[1fr_92px_110px_110px] gap-3 border-t border-ink/10 pt-2">
          <span className="text-xs font-medium uppercase tracking-label text-ink-muted">
            Subtotale {block.title.toLowerCase()}
          </span>
          <span className="tnum text-right text-sm text-ink-muted">{formatEur(block.subtotal.cost)}</span>
          <span className="tnum text-right text-sm text-ink-muted">{formatEur(block.subtotal.listino)}</span>
          <span className="tnum text-right text-sm font-medium text-ink">{formatEur(block.subtotal.privati)}</span>
        </div>
      )}
    </section>
  );
}

// ---- Riga (primaria + figlie) ----------------------------------------------

function Row({ row, isClient }: { row: PreviewRow; isClient: boolean }) {
  const children = isClient ? row.children?.filter((c) => c.showInClient) : row.children;
  const hasChildren = !!children && children.length > 0;

  return (
    <div className="break-inside-avoid py-1.5">
      {isClient ? (
        <div className="grid grid-cols-[1fr_120px] items-baseline gap-3">
          <span className={`text-sm ${row.emphasis ? 'text-ink' : 'text-ink-soft'}`}>{row.label}</span>
          <span className="tnum text-right text-sm text-ink-soft">{formatEur(row.privati)}</span>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_92px_110px_110px] items-baseline gap-3">
          <div>
            <span className={`text-sm ${row.emphasis ? 'font-medium text-ink' : 'text-ink-soft'}`}>
              {row.label}
            </span>
            {!hasChildren && row.description && (
              <span className="ml-2 text-xs text-ink-faint">{row.description}</span>
            )}
          </div>
          <span className="tnum text-right text-sm text-ink-muted">{formatEur(row.cost ?? 0)}</span>
          <span className="tnum text-right text-sm text-ink-muted">{formatEur(row.listino ?? 0)}</span>
          <span className="tnum text-right text-sm text-ink-soft">{formatEur(row.privati)}</span>
        </div>
      )}

      {/* Sottovoci di dettaglio — indentate */}
      {hasChildren && (
        <div className="mt-1.5 space-y-1 border-l border-line/70 pl-4">
          {children!.map((c, i) =>
            isClient ? (
              <div key={i} className="grid grid-cols-[1fr_120px] items-baseline gap-3">
                <div>
                  <span className="text-[13px] text-ink-soft">{c.label}</span>
                  {c.description && (
                    <span className="ml-2 text-xs text-ink-faint">{c.description}</span>
                  )}
                </div>
                <span className="tnum text-right text-[13px] text-ink-muted">{formatEur(c.privati)}</span>
              </div>
            ) : (
              <div key={i} className="grid grid-cols-[1fr_92px_110px_110px] items-baseline gap-3">
                <div>
                  <span className="text-[13px] text-ink-soft">{c.label}</span>
                  {c.description && (
                    <span className="ml-2 text-xs text-ink-faint">{c.description}</span>
                  )}
                </div>
                <span className="tnum text-right text-[13px] text-ink-muted">{formatEur(c.cost ?? 0)}</span>
                <span className="tnum text-right text-[13px] text-ink-muted">{formatEur(c.listino ?? 0)}</span>
                <span className="tnum text-right text-[13px] text-ink-muted">{formatEur(c.privati)}</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ---- Totali ----------------------------------------------------------------

function InternalTotals({ totals }: { totals: ReturnType<typeof buildPreview>['totals'] }) {
  const rettListino = totals.rettificaListino !== 0;
  const rettPrivati = totals.rettificaPrivati !== 0;
  return (
    <div className="mt-10 break-inside-avoid border-t-2 border-ink/15 pt-6">
      <div className="flex items-baseline justify-between py-1.5">
        <span className="text-sm text-ink-muted">Costo totale</span>
        <span className="tnum text-sm text-ink-muted">{formatEur(totals.costoTotale)}</span>
      </div>
      <div className="mt-3 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl2 bg-stone-50 px-6 py-5">
          <p className="label-eyebrow">Listino rivenditori</p>
          {rettListino && (
            <p className="tnum mt-1 text-xs text-ink-faint line-through">{formatEur0(totals.prezzoListinoBase)}</p>
          )}
          <p className="tnum mt-1 font-serif text-3xl text-ink">{formatEur0(totals.prezzoListinoFinale)}</p>
        </div>
        <div className="rounded-xl2 bg-accent/5 px-6 py-5">
          <p className="label-eyebrow">Netto privati</p>
          {rettPrivati && (
            <p className="tnum mt-1 text-xs text-ink-faint line-through">{formatEur0(totals.prezzoPrivatiBase)}</p>
          )}
          <p className="tnum mt-1 font-serif text-3xl text-accent">{formatEur0(totals.prezzoPrivatiFinale)}</p>
        </div>
      </div>
    </div>
  );
}

function ClientTotal({ value }: { value: number }) {
  return (
    <div className="mt-10 break-inside-avoid rounded-xl2 bg-stone-50 px-8 py-7">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="label-eyebrow">Prezzo netto</p>
          <p className="mt-1 text-sm text-ink-muted">IVA esclusa · lavorazione e posa incluse</p>
        </div>
        <p className="tnum font-serif text-[2.75rem] leading-none text-ink">{formatEur0(value)}</p>
      </div>
    </div>
  );
}
