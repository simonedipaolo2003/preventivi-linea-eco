import { AddRowButton, RemoveRowButton, EmptyHint } from '@/components/primitives';
import { NumberField, TextField } from '@/components/fields';
import { uid } from '@/lib/id';
import type { Adjustment } from '@/domain/types';

/** Editor riutilizzabile per liste di voci a corpo / supplementi (costo grezzo). */
export function AdjustmentEditor({
  title,
  hint,
  items,
  onChange,
  addLabel,
}: {
  title: string;
  hint?: string;
  items: Adjustment[];
  onChange: (items: Adjustment[]) => void;
  addLabel: string;
}) {
  const patch = (id: string, fn: (a: Adjustment) => void) => {
    const next = items.map((a) => {
      if (a.id !== id) return a;
      const copy = { ...a };
      fn(copy);
      return copy;
    });
    onChange(next);
  };

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="label-eyebrow">{title}</h3>
      </div>
      {hint && <p className="mb-3 -mt-1 text-xs text-ink-faint">{hint}</p>}
      {items.length === 0 && <EmptyHint>Nessuna voce.</EmptyHint>}
      <div className="divide-y divide-line/70">
        {items.map((a) => (
          <div key={a.id} className="group/row grid grid-cols-1 items-end gap-3 py-3 lg:grid-cols-[1fr_140px_28px]">
            <TextField
              value={a.etichetta}
              onChange={(v) => patch(a.id, (x) => (x.etichetta = v))}
              placeholder="Descrizione voce"
            />
            <NumberField value={a.importo} onChange={(v) => patch(a.id, (x) => (x.importo = v))} suffix="€" />
            <div className="flex justify-end lg:items-center">
              <RemoveRowButton onClick={() => onChange(items.filter((x) => x.id !== a.id))} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <AddRowButton onClick={() => onChange([...items, { id: uid('adj'), etichetta: '', importo: 0 }])}>
          {addLabel}
        </AddRowButton>
      </div>
    </div>
  );
}
