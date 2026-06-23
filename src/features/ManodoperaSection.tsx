import { SectionShell, AddRowButton, RemoveRowButton, SectionTotal } from '@/components/primitives';
import { NumberField, TextField, DerivedValue } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { calcLaborRow, laborHourlyRate } from '@/domain/pricing/engine';
import { emptyLaborExtra } from '@/domain/quoteFactory';
import { formatEur } from '@/lib/money';
import type { LaborTaskRow } from '@/domain/types';

export function ManodoperaSection() {
  const manodopera = useQuoteStore((s) => s.quote.manodopera);
  const params = useQuoteStore((s) => s.params);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  const patch = (id: string, fn: (r: LaborTaskRow) => void) =>
    updateQuote((q) => {
      const r = q.manodopera.find((x) => x.id === id);
      if (r) fn(r);
    });

  return (
    <SectionShell
      id="manodopera"
      index="06"
      title="Progettazione, manodopera e produzione"
      description={`Costo orario standard ${formatEur(params.costoOrarioProduzione)}/h da configurazione.`}
    >
      <div className="mb-2 hidden grid-cols-[1fr_92px_110px_120px_28px] items-end gap-3 px-1 lg:grid">
        <span className="label-eyebrow">Mansione</span>
        <span className="label-eyebrow text-right">Ore</span>
        <span className="label-eyebrow text-right">€ / h</span>
        <span className="label-eyebrow text-right">Totale</span>
        <span />
      </div>

      <div className="divide-y divide-line/70">
        {manodopera.map((row) => {
          const isExtra = row.kind === 'extra';
          return (
            <div
              key={row.id}
              className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1fr_92px_110px_120px_28px]"
            >
              {isExtra ? (
                <TextField
                  value={row.etichetta}
                  onChange={(v) => patch(row.id, (r) => (r.etichetta = v))}
                  placeholder="Mansione extra"
                />
              ) : (
                <div className="py-2.5 text-[15px] text-ink-soft">{row.etichetta}</div>
              )}
              <NumberField value={row.ore} onChange={(v) => patch(row.id, (r) => (r.ore = v))} />
              {isExtra ? (
                <NumberField
                  value={row.costoOrarioManuale ?? 0}
                  onChange={(v) => patch(row.id, (r) => (r.costoOrarioManuale = v))}
                  suffix="€"
                />
              ) : (
                <DerivedValue>{formatEur(laborHourlyRate(row, params))}</DerivedValue>
              )}
              <DerivedValue emphasis>{formatEur(calcLaborRow(row, params))}</DerivedValue>
              <div className="flex justify-end lg:items-center">
                {isExtra && (
                  <RemoveRowButton
                    onClick={() => updateQuote((q) => (q.manodopera = q.manodopera.filter((r) => r.id !== row.id)))}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <AddRowButton onClick={() => updateQuote((q) => q.manodopera.push(emptyLaborExtra()))}>
          Aggiungi mansione extra
        </AddRowButton>
      </div>

      <SectionTotal value={totals.sezioni.manodopera} />
    </SectionShell>
  );
}
