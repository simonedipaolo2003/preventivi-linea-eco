// ============================================================================
// Currency, rounding and parsing helpers.
// ============================================================================

/** Excel MROUND: rounds value to nearest multiple. */
export function mround(value: number, multiple: number): number {
  if (multiple === 0) return 0;
  return Math.round(value / multiple) * multiple;
}

/** Round to 2 decimals to avoid binary float drift in cumulative sums. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const eur = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eur0 = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format as € with 2 decimals (it-IT). */
export function formatEur(value: number): string {
  return eur.format(value || 0);
}

/** Format as € with no decimals — for final commercial prices. */
export function formatEur0(value: number): string {
  return eur0.format(value || 0);
}

const num = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
  return num.format(value || 0);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`;
}

/** Parse a user-typed numeric string (accepts comma or dot decimals). */
export function parseNumber(input: string): number {
  if (input == null) return 0;
  const normalized = String(input).replace(/\s/g, '').replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}
