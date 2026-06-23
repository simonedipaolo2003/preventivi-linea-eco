import { useMemo } from 'react';
import { SectionShell, AddRowButton, RemoveRowButton, SectionTotal, EmptyHint } from '@/components/primitives';
import { NumberField, SelectField, DerivedValue } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { SPECIAL_WORKS, SPECIAL_SUPPLEMENTS, getSpecialWork } from '@/domain/catalog';
import { calcSpecialWorkRow, calcSpecialSupplementRow } from '@/domain/pricing/engine';
import { uid } from '@/lib/id';
import { formatEur } from '@/lib/money';
import type { SpecialWorkRow, SpecialSupplementRow } from '@/domain/types';

export function LavorazioniSection() {
  const lavorazioni = useQuoteStore((s) => s.quote.lavorazioni);
  const supplementi = useQuoteStore((s) => s.quote.supplementiSpeciali);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  const groups = useMemo(() => {
    const tipologie = Array.from(new Set(SPECIAL_WORKS.map((w) => w.tipologia)));
    return tipologie.map((t) => ({
      label: t,
      options: SPECIAL_WORKS.filter((w) => w.tipologia === t).map((w) => ({
        value: w.id,
        label: `${w.materiale} · ${formatEur(w.prezzo)}/${w.um.toLowerCase()}`,
      })),
    }));
  }, []);

  const patchWork = (id: string, fn: (r: SpecialWorkRow) => void) =>
    updateQuote((q) => {
      const r = q.lavorazioni.find((x) => x.id === id);
      if (r) fn(r);
    });

  return (
    <SectionShell
      id="lavorazioni"
      index="05"
      title="Ciottoli, mattoni e lavorazioni speciali"
      description="Materiale compreso. Supplemento per angolo a vista calcolato automaticamente."
    >
      <div className="mb-2 hidden grid-cols-[1.5fr_84px_72px_92px_120px_28px] items-end gap-3 px-1 lg:grid">
        <span className="label-eyebrow">Lavorazione</span>
        <span className="label-eyebrow text-right">Quantità</span>
        <span className="label-eyebrow text-right">U.M.</span>
        <span className="label-eyebrow text-right">N° angoli</span>
        <span className="label-eyebrow text-right">Totale</span>
        <span />
      </div>
      <div className="divide-y divide-line/70">
        {lavorazioni.map((row) => {
          const item = getSpecialWork(row.laborId);
          return (
            <div
              key={row.id}
              className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1.5fr_84px_72px_92px_120px_28px]"
            >
              <SelectField
                value={row.laborId ?? ''}
                onChange={(v) => patchWork(row.id, (r) => (r.laborId = v))}
                options={[]}
                groups={groups}
                placeholder="Seleziona lavorazione…"
              />
              <NumberField value={row.quantita} onChange={(v) => patchWork(row.id, (r) => (r.quantita = v))} />
              <DerivedValue>{item?.um ?? '—'}</DerivedValue>
              <NumberField value={row.angoli} onChange={(v) => patchWork(row.id, (r) => (r.angoli = v))} />
              <DerivedValue emphasis>{formatEur(calcSpecialWorkRow(row))}</DerivedValue>
              <div className="flex justify-end lg:items-center">
                <RemoveRowButton
                  onClick={() => updateQuote((q) => (q.lavorazioni = q.lavorazioni.filter((r) => r.id !== row.id)))}
                />
              </div>
            </div>
          );
        })}
        {lavorazioni.length === 0 && <EmptyHint>Nessuna lavorazione. Aggiungi ciottoli, pietra, mattone, soglie o gettati.</EmptyHint>}
      </div>
      <div className="mt-4">
        <AddRowButton
          onClick={() => updateQuote((q) => q.lavorazioni.push({ id: uid('lav'), quantita: 0, angoli: 0 }))}
        >
          Aggiungi lavorazione
        </AddRowButton>
      </div>

      {/* Supplementi speciali */}
      <div className="mt-9">
        <h3 className="label-eyebrow mb-3">Supplementi gettati</h3>
        <div className="space-y-2">
          {SPECIAL_SUPPLEMENTS.map((def) => {
            const row =
              supplementi.find((s) => s.supplementId === def.id) ??
              ({ id: `pending-${def.id}`, supplementId: def.id, quantita: 0 } as SpecialSupplementRow);
            const exists = supplementi.some((s) => s.supplementId === def.id);
            const setQty = (v: number) =>
              updateQuote((q) => {
                const found = q.supplementiSpeciali.find((s) => s.supplementId === def.id);
                if (found) found.quantita = v;
                else q.supplementiSpeciali.push({ id: uid('sup'), supplementId: def.id, quantita: v });
              });
            return (
              <div
                key={def.id}
                className="grid grid-cols-1 items-end gap-3 py-2 lg:grid-cols-[1fr_120px_120px] lg:items-center"
              >
                <div>
                  <p className="text-sm text-ink-soft">{def.nome}</p>
                  <p className="text-xs text-ink-faint">
                    {def.note} · {def.tipo === 'PERCENT' ? `+${def.valore * 100}%` : `${formatEur(def.valore)}/pz`}
                  </p>
                </div>
                <NumberField
                  value={row.quantita}
                  onChange={setQty}
                  suffix={def.tipo === 'PERCENT' ? '€ base' : 'pz'}
                />
                <DerivedValue emphasis>
                  {exists ? formatEur(calcSpecialSupplementRow(row)) : '—'}
                </DerivedValue>
              </div>
            );
          })}
        </div>
      </div>

      <SectionTotal value={totals.sezioni.lavorazioni} />
    </SectionShell>
  );
}
