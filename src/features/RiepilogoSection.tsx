import { SectionShell, SegmentToggle } from '@/components/primitives';
import { AdjustmentEditor } from '@/components/AdjustmentEditor';
import { NumberField } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { formatEur } from '@/lib/money';
import type { CostLine, FinalAdjustment } from '@/domain/types';

function CostTable({ title, lines }: { title: string; lines: CostLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <div className="mb-2 grid grid-cols-[1fr_100px_120px_120px] gap-3 px-1">
        <span className="label-eyebrow">{title}</span>
        <span className="label-eyebrow text-right">Costo</span>
        <span className="label-eyebrow text-right">Listino riv.</span>
        <span className="label-eyebrow text-right">Netto privati</span>
      </div>
      <div className="divide-y divide-line/60">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_100px_120px_120px] gap-3 py-2 text-sm">
            <span className="text-ink-soft">{l.etichetta}</span>
            <span className="tnum text-right text-ink-muted">{formatEur(l.costo)}</span>
            <span className="tnum text-right text-ink-muted">{formatEur(l.listino)}</span>
            <span className="tnum text-right text-ink-soft">{formatEur(l.privati)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RettificaControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FinalAdjustment;
  onChange: (v: FinalAdjustment) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <span className="field-label">{label}</span>
        <SegmentToggle
          value={value.tipo}
          options={[
            { value: 'assoluto', label: '€ assoluto' },
            { value: 'percentuale', label: '%' },
          ]}
          onChange={(t) => onChange({ ...value, tipo: t })}
        />
      </div>
      <NumberField
        value={value.tipo === 'percentuale' ? value.valore * 100 : value.valore}
        onChange={(v) => onChange({ ...value, valore: value.tipo === 'percentuale' ? v / 100 : v })}
        suffix={value.tipo === 'percentuale' ? '%' : '€'}
        allowNegative
        className="w-32"
      />
    </div>
  );
}

export function RiepilogoSection() {
  const quote = useQuoteStore((s) => s.quote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  return (
    <SectionShell
      id="riepilogo"
      index="07"
      title="Riepilogo economico"
      description="Dettaglio costi, supplementi e prezzi commerciali finali con eventuale rettifica."
    >
      <div className="space-y-8">
        <CostTable title="Materie prime" lines={totals.riepilogoMateriePrime} />
        <CostTable title="Altri costi" lines={totals.riepilogoAltriCosti} />

        <div className="grid gap-8 lg:grid-cols-2">
          <AdjustmentEditor
            title="Altri costi a corpo · materie prime"
            items={quote.altriCostiMateriePrime}
            onChange={(items) => updateQuote((q) => (q.altriCostiMateriePrime = items))}
            addLabel="Aggiungi voce"
          />
          <AdjustmentEditor
            title="Altri costi a corpo · produzione"
            items={quote.altriCostiProduzione}
            onChange={(items) => updateQuote((q) => (q.altriCostiProduzione = items))}
            addLabel="Aggiungi voce"
          />
          <AdjustmentEditor
            title="Supplementi a margine"
            hint="Intesi come vendita — soggetti a margine e moltiplicatore."
            items={quote.supplementiAMargine}
            onChange={(items) => updateQuote((q) => (q.supplementiAMargine = items))}
            addLabel="Aggiungi supplemento"
          />
          <AdjustmentEditor
            title="Supplementi senza margine"
            hint="Trasporto, spedizione, unicità — intesi come rimborso spese."
            items={quote.supplementiSenzaMargine}
            onChange={(items) => updateQuote((q) => (q.supplementiSenzaMargine = items))}
            addLabel="Aggiungi supplemento"
          />
        </div>

        {(totals.supplementiAMargine.length > 0 || totals.supplementiSenzaMargine.length > 0) && (
          <CostTable
            title="Supplementi"
            lines={[...totals.supplementiAMargine, ...totals.supplementiSenzaMargine]}
          />
        )}

        {/* Rettifiche finali */}
        <div className="rounded-xl2 border border-line bg-stone-50/60 p-6">
          <h3 className="label-eyebrow mb-5">Rettifica finale prezzi</h3>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-3">
              <RettificaControl
                label="Rettifica listino rivenditori"
                value={quote.rettificaListino}
                onChange={(v) => updateQuote((q) => (q.rettificaListino = v))}
              />
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm text-ink-muted">Base {formatEur(totals.prezzoListinoBase)}</span>
                <span className="tnum font-serif text-xl text-ink">{formatEur(totals.prezzoListinoFinale)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <RettificaControl
                label="Rettifica netto privati"
                value={quote.rettificaPrivati}
                onChange={(v) => updateQuote((q) => (q.rettificaPrivati = v))}
              />
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="text-sm text-ink-muted">Base {formatEur(totals.prezzoPrivatiBase)}</span>
                <span className="tnum font-serif text-xl text-accent">{formatEur(totals.prezzoPrivatiFinale)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
