import { AnimatePresence, motion } from 'framer-motion';
import { NumberField } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import type { PricingParams } from '@/domain/types';

interface FieldDef {
  key: keyof PricingParams;
  label: string;
  kind: 'euro' | 'percent' | 'plain';
}

const GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Costi orari',
    fields: [
      { key: 'costoOrarioProduzione', label: 'Produzione', kind: 'euro' },
      { key: 'costoOrarioMessaInLavorazione', label: 'Messa in lavorazione', kind: 'euro' },
      { key: 'costoOrarioProgettazione', label: 'Progettazione', kind: 'euro' },
    ],
  },
  {
    title: 'Quote su costi',
    fields: [
      { key: 'materialiConsumo', label: 'Materiali di consumo', kind: 'percent' },
      { key: 'imballaggio', label: 'Imballaggio', kind: 'percent' },
      { key: 'costiFissi', label: 'Costi fissi', kind: 'percent' },
      { key: 'gestioneGaranzia', label: 'Gestione garanzia', kind: 'percent' },
      { key: 'frido', label: 'Frido', kind: 'percent' },
    ],
  },
  {
    title: 'Margini e listino',
    fields: [
      { key: 'marginePrivato', label: 'Margine privato', kind: 'percent' },
      { key: 'margineRivenditori', label: 'Margine rivenditori', kind: 'percent' },
      { key: 'moltiplicatoreListino', label: 'Moltiplicatore prezzo di listino', kind: 'plain' },
    ],
  },
  {
    title: 'Altri',
    fields: [{ key: 'supportiPrezzoMq', label: 'Supporti e sostegni (€/mq)', kind: 'euro' }],
  },
];

export function ParametriPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const params = useQuoteStore((s) => s.params);
  const updateParams = useQuoteStore((s) => s.updateParams);
  const resetParams = useQuoteStore((s) => s.resetParams);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 no-print">
          <motion.div
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-chalk shadow-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-line px-7 py-5">
              <div>
                <span className="label-eyebrow">Configurazione</span>
                <h2 className="font-serif text-xl text-ink">Parametri di pricing</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Chiudi"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="flex-1 space-y-8 overflow-y-auto px-7 py-6">
              {GROUPS.map((g) => (
                <div key={g.title}>
                  <h3 className="label-eyebrow mb-3">{g.title}</h3>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    {g.fields.map((f) => (
                      <NumberField
                        key={f.key}
                        label={f.label}
                        value={f.kind === 'percent' ? params[f.key] * 100 : params[f.key]}
                        onChange={(v) =>
                          updateParams((p) => {
                            p[f.key] = f.kind === 'percent' ? v / 100 : v;
                          })
                        }
                        suffix={f.kind === 'percent' ? '%' : f.kind === 'euro' ? '€' : '×'}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <footer className="border-t border-line px-7 py-4">
              <button
                onClick={resetParams}
                className="text-xs font-medium text-ink-muted transition-colors hover:text-accent"
              >
                Ripristina valori predefiniti
              </button>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
