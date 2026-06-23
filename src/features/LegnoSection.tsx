import { useMemo } from 'react';
import { SectionShell, AddRowButton, RemoveRowButton, SectionTotal, EmptyHint } from '@/components/primitives';
import { NumberField, SelectField, TextField, DerivedValue } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { WOODS, WOOD_FINISHES } from '@/domain/catalog';
import { calcWoodRow } from '@/domain/pricing/engine';
import { emptyWoodRow } from '@/domain/quoteFactory';
import { formatEur } from '@/lib/money';
import type { WoodRow } from '@/domain/types';

export function LegnoSection() {
  const legno = useQuoteStore((s) => s.quote.legno);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  const woodOptions = useMemo(() => WOODS.map((w) => ({ value: w.id, label: w.nome })), []);
  const finishOptions = useMemo(() => WOOD_FINISHES.map((f) => ({ value: f.id, label: f.nome })), []);

  const patch = (id: string, fn: (row: WoodRow) => void) =>
    updateQuote((q) => {
      const row = q.legno.find((r) => r.id === id);
      if (row) fn(row);
    });
  const remove = (id: string) => updateQuote((q) => (q.legno = q.legno.filter((r) => r.id !== id)));

  const soglie = legno.filter((r) => r.kind === 'soglia');
  const componenti = legno.filter((r) => r.kind === 'componente');

  return (
    <SectionShell
      id="legno"
      index="04"
      title="Parti e componenti in legno"
      description="Soglie di serie con finitura, cassettoni e componenti su misura."
    >
      <h3 className="label-eyebrow mb-3">Soglie in legno di serie</h3>
      <div className="mb-2 hidden grid-cols-[1.4fr_80px_1fr_120px_28px] items-end gap-3 px-1 lg:grid">
        <span className="label-eyebrow">Soglia</span>
        <span className="label-eyebrow text-right">cm</span>
        <span className="label-eyebrow">Finitura</span>
        <span className="label-eyebrow text-right">Totale</span>
        <span />
      </div>
      <div className="divide-y divide-line/70">
        {soglie.map((row) => (
          <div
            key={row.id}
            className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1.4fr_80px_1fr_120px_28px]"
          >
            <SelectField
              value={row.woodId ?? ''}
              onChange={(v) => patch(row.id, (r) => (r.woodId = v))}
              options={woodOptions}
              placeholder="Seleziona soglia…"
            />
            <NumberField value={row.quantita} onChange={(v) => patch(row.id, (r) => (r.quantita = v))} />
            <SelectField
              value={row.finishId ?? ''}
              onChange={(v) => patch(row.id, (r) => (r.finishId = v))}
              options={finishOptions}
              placeholder="Finitura…"
            />
            <DerivedValue emphasis>{formatEur(calcWoodRow(row).totale)}</DerivedValue>
            <div className="flex justify-end lg:items-center">
              <RemoveRowButton onClick={() => remove(row.id)} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <AddRowButton onClick={() => updateQuote((q) => q.legno.push(emptyWoodRow('soglia')))}>
          Aggiungi soglia
        </AddRowButton>
      </div>

      <div className="mt-9">
        <h3 className="label-eyebrow mb-3">Cassettoni e componenti su preventivo</h3>
        {componenti.length === 0 && <EmptyHint>Nessun componente aggiuntivo.</EmptyHint>}
        <div className="divide-y divide-line/70">
          {componenti.map((row) => (
            <div
              key={row.id}
              className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1.4fr_80px_110px_120px_28px]"
            >
              <TextField
                value={row.descrizione ?? ''}
                onChange={(v) => patch(row.id, (r) => (r.descrizione = v))}
                placeholder="Descrizione componente"
              />
              <NumberField value={row.quantita} onChange={(v) => patch(row.id, (r) => (r.quantita = v))} suffix="qt" />
              <NumberField
                value={row.prezzoUnitario ?? 0}
                onChange={(v) => patch(row.id, (r) => (r.prezzoUnitario = v))}
                suffix="€"
              />
              <DerivedValue emphasis>{formatEur(calcWoodRow(row).totale)}</DerivedValue>
              <div className="flex justify-end lg:items-center">
                <RemoveRowButton onClick={() => remove(row.id)} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <AddRowButton onClick={() => updateQuote((q) => q.legno.push(emptyWoodRow('componente')))}>
            Aggiungi componente
          </AddRowButton>
        </div>
      </div>

      <SectionTotal value={totals.sezioni.legno} />
    </SectionShell>
  );
}
