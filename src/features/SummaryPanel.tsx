import { AnimatedMoney } from '@/components/AnimatedMoney';
import { useTotals } from '@/app/useTotals';
import { useQuoteStore } from '@/app/store';
import { formatEur } from '@/lib/money';
import type { SectionKey } from '@/domain/types';

const SECTION_LABELS: { key: SectionKey; label: string }[] = [
  { key: 'materiali', label: 'Materiali' },
  { key: 'supporti', label: 'Supporti e sostegni' },
  { key: 'legno', label: 'Legno' },
  { key: 'lavorazioni', label: 'Ciottoli e mattoni' },
  { key: 'manodopera', label: 'Manodopera' },
];

export function SummaryPanel() {
  const totals = useTotals();
  const cliente = useQuoteStore((s) => s.quote.header.intestazioneCliente);

  return (
    <aside className="flex flex-col gap-7">
      <div>
        <span className="label-eyebrow">Riepilogo preventivo</span>
        <p className="mt-1 font-serif text-lg text-ink">
          {cliente || <span className="text-ink-faint">Nuovo preventivo</span>}
        </p>
      </div>

      {/* Subtotali sezioni */}
      <div className="space-y-2.5">
        {SECTION_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-baseline justify-between text-sm">
            <span className="text-ink-muted">{label}</span>
            <span className="tnum text-ink-soft">{formatEur(totals.sezioni[key])}</span>
          </div>
        ))}
      </div>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm text-ink-muted">Costo totale</span>
        <span className="tnum text-[15px] font-medium text-ink">{formatEur(totals.costoTotale)}</span>
      </div>

      {/* Prezzi commerciali */}
      <div className="space-y-5 rounded-xl2 bg-stone-50 p-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="label-eyebrow">Listino rivenditori</span>
          </div>
          <AnimatedMoney
            value={totals.prezzoListinoFinale}
            decimals={false}
            className="mt-1 font-serif text-2xl text-ink"
          />
        </div>
        <div className="border-t border-line/80 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="label-eyebrow">Netto privati</span>
          </div>
          <AnimatedMoney
            value={totals.prezzoPrivatiFinale}
            decimals={false}
            className="mt-1 font-serif text-[2rem] leading-none text-accent"
          />
        </div>
      </div>

      <p className="text-2xs leading-relaxed text-ink-faint">
        Prezzi arrotondati a 10 €. I valori si aggiornano automaticamente ad ogni modifica.
      </p>
    </aside>
  );
}
