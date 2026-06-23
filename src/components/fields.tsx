import { useId, useState } from 'react';
import { parseNumber } from '@/lib/money';

interface BaseProps {
  label?: string;
  className?: string;
}

interface TextFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'date';
}

export function TextField({ label, value, onChange, placeholder, type = 'text', className }: TextFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className="field-input-boxed"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TextAreaProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ label, value, onChange, placeholder, rows = 3, className }: TextAreaProps) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        className="field-input-boxed resize-none leading-relaxed"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface NumberFieldProps extends BaseProps {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  suffix?: string;
  align?: 'left' | 'right';
  allowNegative?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  align = 'right',
  allowNegative = false,
  className,
}: NumberFieldProps) {
  const id = useId();
  // Mentre l'utente digita teniamo il testo grezzo (draft) così da poter
  // inserire decimali con la virgola (es. "1," → "1,2") senza che il valore
  // venga riformattato a ogni tasto. Al blur torniamo al valore canonico.
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? (value === 0 ? '' : String(value).replace('.', ','));
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={id}
          inputMode="decimal"
          className={`field-input-boxed tnum ${align === 'right' ? 'text-right' : ''} ${suffix ? 'pr-9' : ''}`}
          value={display}
          placeholder={placeholder ?? '0'}
          onChange={(e) => {
            let raw = e.target.value.replace(allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g, '');
            if (allowNegative) {
              // tieni solo un eventuale segno meno in testa
              const neg = raw.startsWith('-');
              raw = (neg ? '-' : '') + raw.replace(/-/g, '');
            }
            setDraft(raw);
            onChange(parseNumber(raw));
          }}
          onBlur={() => setDraft(null)}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 text-xs text-ink-faint">{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  groups?: { label: string; options: Option[] }[];
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  groups,
  placeholder = 'Seleziona…',
  className,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <select
        id={id}
        className="field-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {groups
          ? groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))
          : options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
      </select>
    </div>
  );
}

/** Valore di sola lettura derivato (es. prezzo da listino, totale riga). */
export function DerivedValue({
  label,
  children,
  emphasis,
}: {
  label?: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div>
      {label && <span className="field-label">{label}</span>}
      <div
        className={`tnum py-2.5 text-right ${
          emphasis ? 'text-[15px] font-medium text-ink' : 'text-[15px] text-ink-soft'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
