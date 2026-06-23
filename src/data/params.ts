import type { PricingParams } from '@/domain/types';

/**
 * Parametri globali di pricing — valori iniziali estratti dal foglio "DATI"
 * dell'Excel aziendale. Modificabili a runtime dal pannello Parametri.
 */
export const DEFAULT_PRICING_PARAMS: PricingParams = {
  costoOrarioProduzione: 21,
  costoOrarioMessaInLavorazione: 21,
  costoOrarioProgettazione: 21,
  materialiConsumo: 0.06,
  imballaggio: 0.08,
  costiFissi: 0.12,
  marginePrivato: 1,
  margineRivenditori: 0.6,
  gestioneGaranzia: 0.01,
  supportiPrezzoMq: 50,
  frido: 0.3,
  moltiplicatoreListino: 2,
};
