// ============================================================================
// MaterialPicker — selezione materiale da catalogo con filtro categoria
// (GRES, MARMI, ...) e ricerca libera per nome. Sostituisce la tendina
// semplice per rendere veloce la scelta tra ~70 materiali.
//
// La colonna "Materiale" della tabella è stretta (~160-280px a seconda dello
// schermo): a riposo il controllo è un solo campo di ricerca, identico per
// ingombro alla vecchia tendina. Categoria e risultati vivono nel popover,
// che si apre sopra la riga e non è vincolato alla larghezza della colonna.
// ============================================================================
import { useEffect, useMemo, useState } from 'react';
import { MATERIALS, MATERIAL_FAMILIES, getMaterial } from '@/domain/catalog';

// Confronto accent-insensitive: scompone i caratteri accentati (NFD) e
// rimuove i segni diacritici risultanti, così "è" e "e" combaciano in ricerca.
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}
const DIACRITICS = /\p{Diacritic}/gu;

interface MaterialPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function MaterialPicker({ value, onChange }: MaterialPickerProps) {
  const [category, setCategory] = useState(getMaterial(value)?.famiglia ?? '');
  const [query, setQuery] = useState(getMaterial(value)?.descrizione ?? '');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Riallinea testo e categoria se il valore cambia da fuori (es. ripristino
  // di una versione), ma solo mentre l'utente non sta digitando.
  useEffect(() => {
    if (open) return;
    const mat = getMaterial(value);
    setQuery(mat?.descrizione ?? '');
    setCategory(mat?.famiglia ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return MATERIALS.filter(
      (m) => (!category || m.famiglia === category) && (!q || normalize(m.descrizione).includes(q)),
    );
  }, [query, category]);

  useEffect(() => {
    setHighlight(0);
  }, [filtered.length, open]);

  const pick = (id: string) => {
    onChange(id);
    setQuery(getMaterial(id)?.descrizione ?? '');
    setOpen(false);
  };

  const selectCategory = (f: string) => {
    setCategory(f);
    // Un testo di ricerca residuo (es. la descrizione del materiale già
    // scelto) filtrerebbe fuori l'intera categoria appena selezionata.
    setQuery('');
  };

  // Riporta testo e categoria a rispecchiare la selezione effettiva, così un
  // giro di filtri abbandonato a metà (senza scegliere nulla) non lascia il
  // picker in uno stato "filtrato a vuoto" alla riapertura successiva.
  const revert = () => {
    const mat = getMaterial(value);
    setQuery(mat?.descrizione ?? '');
    setCategory(mat?.famiglia ?? '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      revert();
    }
  };

  return (
    <div className="relative w-full min-w-0">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onBlur={() => {
          setOpen(false);
          revert();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Cerca materiale…"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className="field-input-boxed"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-[320px] max-w-[80vw] overflow-hidden rounded-lg border border-line bg-paper shadow-panel">
          <div className="flex flex-wrap gap-1 border-b border-line/70 p-2">
            <CategoryChip label="Tutte" active={category === ''} onPick={() => selectCategory('')} />
            {MATERIAL_FAMILIES.map((f) => (
              <CategoryChip key={f} label={f} active={category === f} onPick={() => selectCategory(f)} />
            ))}
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs italic text-ink-faint">Nessun materiale trovato.</li>
            ) : (
              filtered.map((m, i) => (
                <li
                  key={m.id}
                  role="option"
                  aria-selected={m.id === value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(m.id)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    i === highlight ? 'bg-stone-100' : ''
                  } ${m.id === value ? 'font-medium text-accent' : 'text-ink-soft'}`}
                >
                  {m.descrizione}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, active, onPick }: { label: string; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
      className={`rounded-full px-2.5 py-1 text-2xs font-medium uppercase tracking-label transition-colors ${
        active ? 'bg-ink text-paper' : 'bg-stone-100 text-ink-muted hover:bg-stone-200'
      }`}
    >
      {label}
    </button>
  );
}
