import { SectionShell, AddRowButton, RemoveRowButton, SectionTotal } from '@/components/primitives';
import { NumberField, TextField, DerivedValue } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { calcSupportRow } from '@/domain/pricing/engine';
import { emptySupportRow } from '@/domain/quoteFactory';
import { formatEur } from '@/lib/money';
import type { SupportRow } from '@/domain/types';

export function SupportiSection() {
  const supporti = useQuoteStore((s) => s.quote.supporti);
  const params = useQuoteStore((s) => s.params);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  const patch = (id: string, fn: (row: SupportRow) => void) =>
    updateQuote((q) => {
      const row = q.supporti.find((r) => r.id === id);
      if (row) fn(row);
    });

  return (
    <SectionShell
      id="supporti"
      index="03"
      title="Supporti e sostegni"
      description={`Prezzo standard ${formatEur(params.supportiPrezzoMq)}/mq da configurazione. Sovrascrivibile per singola voce.`}
    >
      <div className="mb-2 hidden grid-cols-[1fr_92px_110px_120px_28px] items-end gap-3 px-1 lg:grid">
        <span className="label-eyebrow">Voce</span>
        <span className="label-eyebrow text-right">mq</span>
        <span className="label-eyebrow text-right">€ / mq</span>
        <span className="label-eyebrow text-right">Totale</span>
        <span />
      </div>

      <div className="divide-y divide-line/70">
        {supporti.map((row) => (
          <div
            key={row.id}
            className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1fr_92px_110px_120px_28px]"
          >
            <TextField
              value={row.etichetta}
              onChange={(v) => patch(row.id, (r) => (r.etichetta = v))}
              placeholder="Es. Supporti, sostegni…"
            />
            <NumberField value={row.mq} onChange={(v) => patch(row.id, (r) => (r.mq = v))} />
            <NumberField
              value={row.prezzoOverride ?? params.supportiPrezzoMq}
              onChange={(v) =>
                patch(row.id, (r) => (r.prezzoOverride = v === params.supportiPrezzoMq ? undefined : v))
              }
              suffix="€"
            />
            <DerivedValue emphasis>{formatEur(calcSupportRow(row, params))}</DerivedValue>
            <div className="flex justify-end lg:items-center">
              <RemoveRowButton onClick={() => updateQuote((q) => (q.supporti = q.supporti.filter((r) => r.id !== row.id)))} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <AddRowButton onClick={() => updateQuote((q) => q.supporti.push(emptySupportRow()))}>
          Aggiungi voce
        </AddRowButton>
      </div>

      <SectionTotal value={totals.sezioni.supporti} />
    </SectionShell>
  );
}
