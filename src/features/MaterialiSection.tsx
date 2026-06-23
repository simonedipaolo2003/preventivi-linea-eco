import { useMemo } from 'react';
import { SectionShell, AddRowButton, RemoveRowButton, SectionTotal, EmptyHint } from '@/components/primitives';
import { NumberField, SelectField, TextField, DerivedValue } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import { useTotals } from '@/app/useTotals';
import { MATERIALS, MATERIAL_FAMILIES, getMaterial, prezzoPerFascia } from '@/domain/catalog';
import { calcMaterialRow } from '@/domain/pricing/engine';
import { emptyMaterialRow } from '@/domain/quoteFactory';
import { formatEur } from '@/lib/money';
import type { MaterialRow } from '@/domain/types';

export function MaterialiSection() {
  const materiali = useQuoteStore((s) => s.quote.materiali);
  const params = useQuoteStore((s) => s.params);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const totals = useTotals();

  const materialGroups = useMemo(
    () =>
      MATERIAL_FAMILIES.map((fam) => ({
        label: fam,
        options: MATERIALS.filter((m) => m.famiglia === fam).map((m) => ({
          value: m.id,
          label: m.descrizione,
        })),
      })),
    [],
  );

  const patch = (id: string, fn: (row: MaterialRow) => void) =>
    updateQuote((q) => {
      const row = q.materiali.find((r) => r.id === id);
      if (row) fn(row);
    });

  const addRow = (kind: MaterialRow['kind']) =>
    updateQuote((q) => q.materiali.push(emptyMaterialRow(kind)));

  const removeRow = (id: string) =>
    updateQuote((q) => {
      q.materiali = q.materiali.filter((r) => r.id !== id);
    });

  const catalogRows = materiali.filter((r) => r.kind === 'catalogo');
  const manualRows = materiali.filter((r) => r.kind === 'manuale');

  return (
    <SectionShell
      id="materiali"
      index="02"
      title="Materiali"
      description="Rivestimenti da catalogo con frido applicato, più eventuali materiali extra a misura o a corpo."
    >
      {/* Header tabellare — solo desktop */}
      <div className="mb-2 hidden grid-cols-[1fr_92px_92px_92px_104px_28px] items-end gap-3 px-1 lg:grid">
        <span className="label-eyebrow">Materiale</span>
        <span className="label-eyebrow text-right">mq</span>
        <span className="label-eyebrow text-right">€ / mq</span>
        <span className="label-eyebrow text-right">Frido</span>
        <span className="label-eyebrow text-right">Totale</span>
        <span />
      </div>

      <div className="divide-y divide-line/70">
        {catalogRows.map((row) => {
          const mat = getMaterial(row.materialId);
          const res = calcMaterialRow(row, params);
          return (
            <div
              key={row.id}
              className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1fr_92px_92px_92px_104px_28px]"
            >
              <SelectField
                value={row.materialId ?? ''}
                onChange={(v) => patch(row.id, (r) => (r.materialId = v))}
                options={[]}
                groups={materialGroups}
                placeholder="Seleziona materiale…"
              />
              <NumberField value={row.mq} onChange={(v) => patch(row.id, (r) => (r.mq = v))} />
              <DerivedValue>{mat ? formatEur(prezzoPerFascia(mat.fascia)) : '—'}</DerivedValue>
              <DerivedValue>{res.frido ? formatEur(res.frido) : '—'}</DerivedValue>
              <DerivedValue emphasis>{formatEur(res.totale)}</DerivedValue>
              <div className="flex justify-end lg:items-center">
                <RemoveRowButton onClick={() => removeRow(row.id)} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <AddRowButton onClick={() => addRow('catalogo')}>Aggiungi materiale da catalogo</AddRowButton>
      </div>

      {/* Materiali extra / a corpo */}
      <div className="mt-9">
        <h3 className="label-eyebrow mb-3">Materiali extra · fuori catalogo / a corpo</h3>
        {manualRows.length === 0 && (
          <EmptyHint>Nessun materiale extra. Usa il pulsante per aggiungere voci a misura o a corpo.</EmptyHint>
        )}
        <div className="divide-y divide-line/70">
          {manualRows.map((row) => {
            const res = calcMaterialRow(row, params);
            return (
              <div
                key={row.id}
                className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1fr_84px_92px_92px_104px_28px]"
              >
                <TextField
                  value={row.descrizione ?? ''}
                  onChange={(v) => patch(row.id, (r) => (r.descrizione = v))}
                  placeholder="Descrizione materiale extra"
                />
                <NumberField value={row.mq} onChange={(v) => patch(row.id, (r) => (r.mq = v))} suffix="mq" />
                <NumberField
                  value={row.prezzoMqManuale ?? 0}
                  onChange={(v) => patch(row.id, (r) => (r.prezzoMqManuale = v))}
                  suffix="€"
                />
                <NumberField
                  value={row.aCorpo ?? 0}
                  onChange={(v) => patch(row.id, (r) => (r.aCorpo = v))}
                  suffix="€"
                />
                <DerivedValue emphasis>{formatEur(res.totale)}</DerivedValue>
                <div className="flex justify-end lg:items-center">
                  <RemoveRowButton onClick={() => removeRow(row.id)} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-2 hidden grid-cols-[1fr_84px_92px_92px_104px_28px] gap-3 px-1 lg:grid">
          <span />
          <span className="label-eyebrow text-right">mq</span>
          <span className="label-eyebrow text-right">€ / mq</span>
          <span className="label-eyebrow text-right">A corpo</span>
          <span className="label-eyebrow text-right">Totale</span>
          <span />
        </div>
        <div className="mt-4">
          <AddRowButton onClick={() => addRow('manuale')}>Aggiungi materiale extra / a corpo</AddRowButton>
        </div>
      </div>

      <SectionTotal value={totals.sezioni.materiali} />
    </SectionShell>
  );
}
