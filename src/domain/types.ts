// ============================================================================
// DOMAIN TYPES — single source of truth for the quote domain.
// No React, no UI concerns here.
// ============================================================================

// ---- Global pricing parameters (from Excel sheet "DATI") -------------------
export interface PricingParams {
  /** Costo orario produzione/lavorazione (€/h) — DATI!C3 */
  costoOrarioProduzione: number;
  /** Costo orario messa in lavorazione (€/h) — DATI!C4 */
  costoOrarioMessaInLavorazione: number;
  /** Costo orario progettazione (€/h) — DATI!C5 */
  costoOrarioProgettazione: number;
  /** Materiali di consumo (quota su materie prime + manodopera) — DATI!C6 */
  materialiConsumo: number;
  /** Imballaggio (quota cumulativa) — DATI!C7 */
  imballaggio: number;
  /** Costi fissi (quota cumulativa) — DATI!C8 */
  costiFissi: number;
  /** Margine privato — DATI!C9 */
  marginePrivato: number;
  /** Margine rivenditori — DATI!C10 */
  margineRivenditori: number;
  /** Gestione garanzia (quota) — DATI!C11 */
  gestioneGaranzia: number;
  /** Prezzo standard supporti e sostegni (€/mq) — DATI!C12 */
  supportiPrezzoMq: number;
  /** Frido (maggiorazione materiali da catalogo) — DATI!C13 */
  frido: number;
  /** Moltiplicatore prezzo di listino — DATI!C14 */
  moltiplicatoreListino: number;
}

// ---- Catalogs (master data, read-only) -------------------------------------
export type Fascia = 1 | 2 | 3 | 4 | 'M' | 'P' | 'E';

export interface MaterialCatalogItem {
  id: string;
  descrizione: string;
  /** Family grouping for the UI selector (GRES, MARMI, ...) */
  famiglia: string;
  fascia: Fascia;
}

export interface WoodCatalogItem {
  id: string;
  nome: string;
  /** €/cm lineare */
  prezzoCm: number;
}

export interface WoodFinish {
  id: string;
  nome: string;
  /** Maggiorazione percentuale sul costo base soglia (0.05 = +5%) */
  variazione: number;
}

export type UnitaMisura = 'MQ' | 'ML' | 'PZ' | '€';

export interface LaborCatalogItem {
  id: string;
  tipologia: string;
  materiale: string;
  /** €/mq o €/ml */
  prezzo: number;
  um: UnitaMisura;
  /** Supplemento per angolo a vista (€/unità) */
  supplementoAngolo: number;
  note: string;
}

/** Supplementi a quantità fissa per lavorazioni speciali (45°, 2 volte, 3 volte) */
export interface SpecialSupplementDef {
  id: string;
  nome: string;
  note: string;
  /** 'PERCENT' = moltiplicatore sul prezzo base; 'PEZZO' = €/pezzo */
  tipo: 'PERCENT' | 'PEZZO';
  valore: number;
}

// ---- Quote (user input) ----------------------------------------------------
export type QuoteStatus = 'bozza' | 'definitivo';

export interface QuoteHeader {
  data: string;
  intestazioneCliente: string;
  venditore: string;
  riferimento: string;
  focolare: string;
  versione: string;
  richiesteParticolari: string;
  note: string;
}

/** Origine riga materiale: catalogo, extra (mq×prezzo manuale) o a corpo */
export type MaterialRowKind = 'catalogo' | 'manuale';

export interface MaterialRow {
  id: string;
  kind: MaterialRowKind;
  /** Catalogo: id materiale selezionato */
  materialId?: string;
  /** Manuale: descrizione libera */
  descrizione?: string;
  mq: number;
  /** Catalogo: derivato dalla fascia. Manuale: inserito a mano. */
  prezzoMqManuale?: number;
  /** Solo righe manuali: importo a corpo aggiuntivo */
  aCorpo?: number;
}

export interface SupportRow {
  id: string;
  etichetta: string;
  mq: number;
  /** Override manuale del prezzo/mq; se assente usa DATI!supportiPrezzoMq */
  prezzoOverride?: number;
}

export type WoodRowKind = 'soglia' | 'componente';

export interface WoodRow {
  id: string;
  kind: WoodRowKind;
  /** Soglia: id catalogo legno */
  woodId?: string;
  /** Componente libero: descrizione */
  descrizione?: string;
  /** Soglia: cm lineari. Componente: quantità */
  quantita: number;
  /** Soglia: id finitura. */
  finishId?: string;
  /** Componente: prezzo unitario manuale */
  prezzoUnitario?: number;
}

export interface SpecialWorkRow {
  id: string;
  /** id elemento catalogo LAVORATORI */
  laborId?: string;
  quantita: number;
  /** numero angoli a vista */
  angoli: number;
}

export interface SpecialSupplementRow {
  id: string;
  supplementId: string;
  /** quantità (mq per 45°, pezzi per 2/3 volte) */
  quantita: number;
}

export type LaborTaskKind =
  | 'progettazione'
  | 'messaInLavorazione'
  | 'produzione'
  | 'extra';

export interface LaborTaskRow {
  id: string;
  kind: LaborTaskKind;
  etichetta: string;
  ore: number;
  /** Solo extra: costo orario manuale; altrimenti da DATI */
  costoOrarioManuale?: number;
}

/** Voce generica a corpo / supplemento (costo grezzo) */
export interface Adjustment {
  id: string;
  etichetta: string;
  importo: number;
}

/** Rettifica finale: valore assoluto (€) oppure percentuale */
export interface FinalAdjustment {
  tipo: 'assoluto' | 'percentuale';
  valore: number;
}

export interface Quote {
  id: string;
  stato: QuoteStatus;
  header: QuoteHeader;
  materiali: MaterialRow[];
  supporti: SupportRow[];
  legno: WoodRow[];
  lavorazioni: SpecialWorkRow[];
  supplementiSpeciali: SpecialSupplementRow[];
  manodopera: LaborTaskRow[];
  altriCostiMateriePrime: Adjustment[];
  altriCostiProduzione: Adjustment[];
  supplementiAMargine: Adjustment[];
  supplementiSenzaMargine: Adjustment[];
  rettificaListino: FinalAdjustment;
  rettificaPrivati: FinalAdjustment;
}

// ---- Derived totals (computed, never persisted) ----------------------------
export type SectionKey =
  | 'materiali'
  | 'supporti'
  | 'legno'
  | 'lavorazioni'
  | 'manodopera';

/** Riga del breakdown costi con le tre proiezioni (costo, listino, privati) */
export interface CostLine {
  etichetta: string;
  costo: number;
  listino: number;
  privati: number;
}

export interface QuoteTotals {
  /** Subtotali per sezione (costo grezzo) */
  sezioni: Record<SectionKey, number>;
  /** Dettaglio righe materiali per la vista interna */
  righeMateriali: { etichetta: string; prezzo: number; frido: number; totale: number }[];
  riepilogoMateriePrime: CostLine[];
  riepilogoAltriCosti: CostLine[];
  supplementiAMargine: CostLine[];
  supplementiSenzaMargine: CostLine[];
  costoTotale: number;
  /** Prezzo listino rivenditori (MROUND 10), pre-rettifica */
  prezzoListinoBase: number;
  /** Prezzo netto privati (MROUND 10), pre-rettifica */
  prezzoPrivatiBase: number;
  /** Prezzi finali dopo rettifica */
  prezzoListinoFinale: number;
  prezzoPrivatiFinale: number;
}
