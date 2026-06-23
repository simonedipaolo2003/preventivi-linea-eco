import { motion } from 'framer-motion';
import { formatEur } from '@/lib/money';

// ---- Section shell ---------------------------------------------------------
interface SectionShellProps {
  id: string;
  index: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function SectionShell({ id, index, title, description, children }: SectionShellProps) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
      className="scroll-mt-28"
    >
      <header className="mb-7 flex items-baseline gap-4 border-b border-line pb-4">
        <span className="tnum font-serif text-sm text-ink-faint">{index}</span>
        <div>
          <h2 className="font-serif text-2xl leading-none text-ink">{title}</h2>
          {description && <p className="mt-2 text-sm text-ink-muted">{description}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );
}

// ---- Buttons ---------------------------------------------------------------
export function AddRowButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 text-xs font-medium text-ink-muted transition-colors duration-200 hover:text-accent"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line text-ink-muted transition-colors duration-200 group-hover:border-accent group-hover:text-accent">
        +
      </span>
      {children}
    </button>
  );
}

export function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Rimuovi riga"
      className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint opacity-0 transition-all duration-200 hover:bg-stone-100 hover:text-ink-soft group-hover/row:opacity-100"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

// ---- Empty state -----------------------------------------------------------
export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm italic text-ink-faint">{children}</p>;
}

// ---- Section subtotal ------------------------------------------------------
export function SectionTotal({ value, label = 'Totale sezione' }: { value: number; label?: string }) {
  return (
    <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
      <span className="label-eyebrow">{label}</span>
      <span className="tnum font-serif text-xl text-ink">{formatEur(value)}</span>
    </div>
  );
}

// ---- Pill toggle (kind selector) -------------------------------------------
export function SegmentToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-stone-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ease-editorial ${
            value === o.value ? 'bg-paper text-ink shadow-soft' : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
