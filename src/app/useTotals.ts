import { useMemo } from 'react';
import { calcQuote } from '@/domain/pricing/engine';
import type { QuoteTotals } from '@/domain/types';
import { useQuoteStore } from './store';

/** Selector memoizzato: i totali sono SEMPRE derivati, mai persistiti. */
export function useTotals(): QuoteTotals {
  const quote = useQuoteStore((s) => s.quote);
  const params = useQuoteStore((s) => s.params);
  return useMemo(() => calcQuote(quote, params), [quote, params]);
}
