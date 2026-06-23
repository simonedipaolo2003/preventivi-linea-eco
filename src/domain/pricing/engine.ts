// ============================================================================
// PRICING ENGINE — pure functions. Replicates the Excel "TOOL LINEA ECO"
// pricing logic 1:1. No React, no side effects.
//
// Cross-references to the original spreadsheet cells are noted inline.
// ============================================================================
import type {
  Adjustment,
  CostLine,
  LaborTaskRow,
  MaterialRow,
  PricingParams,
  Quote,
  QuoteTotals,
  SpecialSupplementRow,
  SpecialWorkRow,
  SupportRow,
  WoodRow,
} from '@/domain/types';
import {
  getMaterial,
  getSpecialSupplement,
  getSpecialWork,
  getWood,
  getWoodFinish,
  prezzoPerFascia,
} from '@/domain/catalog';
import { mround } from '@/lib/money';

// ---- Row-level calculations ------------------------------------------------

export interface MaterialRowResult {
  /** Prezzo base = mq × prezzo/mq (Excel F) */
  prezzo: number;
  /** Frido applicato (Excel G) — solo righe da catalogo */
  frido: number;
  /** Totale riga (Excel H) */
  totale: number;
  prezzoMq: number;
}

export function calcMaterialRow(row: MaterialRow, params: PricingParams): MaterialRowResult {
  if (row.kind === 'catalogo') {
    const mat = getMaterial(row.materialId);
    const prezzoMq = mat ? prezzoPerFascia(mat.fascia) : 0;
    const prezzo = row.mq * prezzoMq; // F = D*E
    const frido = prezzo * params.frido; // G = F*FRIDO
    return { prezzo, frido, totale: prezzo + frido, prezzoMq }; // H = F+G
  }
  // Riga manuale (extra / a corpo): nessun frido
  const prezzoMq = row.prezzoMqManuale ?? 0;
  const prezzo = row.mq * prezzoMq; // F = D*E
  const aCorpo = row.aCorpo ?? 0; // G (a corpo)
  return { prezzo, frido: 0, totale: prezzo + aCorpo, prezzoMq };
}

export function calcSupportRow(row: SupportRow, params: PricingParams): number {
  const prezzo = row.prezzoOverride ?? params.supportiPrezzoMq; // E = DATI!C12 o override
  return row.mq * prezzo; // H = D*E
}

export interface WoodRowResult {
  base: number;
  supplementoFinitura: number;
  totale: number;
}

export function calcWoodRow(row: WoodRow): WoodRowResult {
  if (row.kind === 'soglia') {
    const wood = getWood(row.woodId);
    const prezzoCm = wood?.prezzoCm ?? 0;
    const base = row.quantita * prezzoCm; // D = B*C
    const finish = getWoodFinish(row.finishId);
    const variazione = finish?.variazione ?? 0; // F = VLOOKUP finitura
    const supplemento = base * variazione; // G = D*F
    return { base, supplementoFinitura: supplemento, totale: base + supplemento }; // H = D+G
  }
  // Componente libero (cassettoni / componenti su preventivo)
  const totale = row.quantita * (row.prezzoUnitario ?? 0); // H = D*E
  return { base: totale, supplementoFinitura: 0, totale };
}

export function calcSpecialWorkRow(row: SpecialWorkRow): number {
  const item = getSpecialWork(row.laborId);
  if (!item) return 0;
  // H = (D*E) + (F*G) — quantità×prezzo + angoli×supplemento angolo
  return row.quantita * item.prezzo + row.angoli * item.supplementoAngolo;
}

export function calcSpecialSupplementRow(row: SpecialSupplementRow): number {
  const def = getSpecialSupplement(row.supplementId);
  if (!def) return 0;
  // PERCENT (45°): importo base × 0.2 ; PEZZO (2/3 volte): n.pezzi × €/pezzo
  return row.quantita * def.valore;
}

export function laborHourlyRate(row: LaborTaskRow, params: PricingParams): number {
  switch (row.kind) {
    case 'progettazione':
      return params.costoOrarioProgettazione;
    case 'messaInLavorazione':
      return params.costoOrarioMessaInLavorazione;
    case 'produzione':
      return params.costoOrarioProduzione;
    case 'extra':
      return row.costoOrarioManuale ?? 0;
  }
}

export function calcLaborRow(row: LaborTaskRow, params: PricingParams): number {
  return row.ore * laborHourlyRate(row, params); // H = B*F
}

// ---- Projections (cost → listino rivenditori / netto privati) --------------

function toListino(costo: number, p: PricingParams): number {
  // D = C × (1 + MARGINE RIVENDITORI) × MOLTIPLICATORE LISTINO
  return costo * (1 + p.margineRivenditori) * p.moltiplicatoreListino;
}

function toPrivati(costo: number, p: PricingParams): number {
  // F = C × (1 + MARGINE PRIVATO)
  return costo * (1 + p.marginePrivato);
}

function costLine(etichetta: string, costo: number, p: PricingParams): CostLine {
  return { etichetta, costo, listino: toListino(costo, p), privati: toPrivati(costo, p) };
}

/**
 * Proietta un costo grezzo nelle tre colonne (costo, listino rivenditori, netto
 * privati) usando la stessa logica del riepilogo. Esposta per il presenter di
 * anteprima: poiché le proiezioni sono lineari, la somma delle sottovoci
 * coincide con il subtotale di sezione (nessun ricalcolo, nessuna divergenza).
 */
export function projectCost(costo: number, p: PricingParams): CostLine {
  return costLine('', costo, p);
}

const sumCosto = (lines: CostLine[]) => lines.reduce((a, l) => a + l.costo, 0);
const sumListino = (lines: CostLine[]) => lines.reduce((a, l) => a + l.listino, 0);
const sumPrivati = (lines: CostLine[]) => lines.reduce((a, l) => a + l.privati, 0);

function adjustmentsToCostLines(items: Adjustment[], p: PricingParams): CostLine[] {
  return items
    .filter((a) => a.importo !== 0 || a.etichetta.trim() !== '')
    .map((a) => costLine(a.etichetta || 'Voce a corpo', a.importo, p));
}

// ---- Full quote calculation ------------------------------------------------

export function calcQuote(quote: Quote, params: PricingParams): QuoteTotals {
  // --- Sezioni (costo grezzo) ---
  const righeMateriali = quote.materiali.map((row) => {
    const r = calcMaterialRow(row, params);
    const mat = getMaterial(row.materialId);
    const etichetta =
      row.kind === 'catalogo'
        ? mat?.descrizione ?? 'Materiale'
        : row.descrizione || 'Materiale extra';
    return { etichetta, prezzo: r.prezzo, frido: r.frido, totale: r.totale };
  });
  const totMateriali = righeMateriali.reduce((a, r) => a + r.totale, 0); // H17

  const totSupporti = quote.supporti.reduce((a, r) => a + calcSupportRow(r, params), 0); // H24
  const totLegno = quote.legno.reduce((a, r) => a + calcWoodRow(r).totale, 0); // H36
  const totLavorazioni =
    quote.lavorazioni.reduce((a, r) => a + calcSpecialWorkRow(r), 0) +
    quote.supplementiSpeciali.reduce((a, r) => a + calcSpecialSupplementRow(r), 0); // H48
  const totManodopera = quote.manodopera.reduce((a, r) => a + calcLaborRow(r, params), 0); // H57

  // --- RIEPILOGO MATERIE PRIME (rows 60-66) ---
  const riepilogoMateriePrime: CostLine[] = [
    costLine('Sezione materiali', totMateriali, params),
    costLine('Sezione supporti e sostegni', totSupporti, params),
    costLine('Sezione parti e componenti in legno', totLegno, params),
    costLine('Sezione ciottoli e mattoni', totLavorazioni, params),
    ...adjustmentsToCostLines(quote.altriCostiMateriePrime, params),
  ];
  const C66 = sumCosto(riepilogoMateriePrime);
  const D66 = sumListino(riepilogoMateriePrime);
  const F66 = sumPrivati(riepilogoMateriePrime);

  // --- RIEPILOGO ALTRI COSTI (rows 69-75) ---
  const C69 = totManodopera;
  const consumo = (C66 + C69) * params.materialiConsumo; // C70
  const imballaggio = (C66 + C69 + consumo) * params.imballaggio; // C71
  const costiFissi = (C66 + C69 + consumo + imballaggio) * params.costiFissi; // C72

  const riepilogoAltriCosti: CostLine[] = [
    costLine('Sezione progettazione, manodopera e produzione', C69, params),
    costLine('Materiali di consumo', consumo, params),
    costLine('Imballaggio', imballaggio, params),
    costLine('Costi fissi', costiFissi, params),
    ...adjustmentsToCostLines(quote.altriCostiProduzione, params),
  ];
  const C75 = sumCosto(riepilogoAltriCosti);
  const D75 = sumListino(riepilogoAltriCosti);
  const F75 = sumPrivati(riepilogoAltriCosti);

  // --- SUPPLEMENTI A MARGINE (rows 78-79) ---
  const garanzia = (C66 + C75) * params.gestioneGaranzia; // C78
  const supplementiAMargine: CostLine[] = [
    costLine('Gestione garanzia', garanzia, params),
    ...adjustmentsToCostLines(quote.supplementiAMargine, params),
  ];

  // --- SUPPLEMENTI SENZA MARGINE (rows 81-85) ---
  // NB: nell'Excel originale questi applicano comunque margine+moltiplicatore.
  // Comportamento replicato 1:1 come da richiesta.
  const supplementiSenzaMargine: CostLine[] = adjustmentsToCostLines(
    quote.supplementiSenzaMargine,
    params,
  );

  // C86 / D86 / F86 = somma di ENTRAMBI i gruppi supplementi (Excel SUM 78:85)
  const allSupplementi = [...supplementiAMargine, ...supplementiSenzaMargine];
  const C86 = sumCosto(allSupplementi);
  const D86 = sumListino(allSupplementi);
  const F86 = sumPrivati(allSupplementi);

  // --- TOTALI ---
  const costoTotale = C66 + C75 + C86; // B88
  const prezzoListinoBase = mround(D66 + D75 + D86, 10); // B90
  const prezzoPrivatiBase = mround(F66 + F75 + F86, 10); // G90

  const prezzoListinoFinale = applyRettifica(prezzoListinoBase, quote.rettificaListino);
  const prezzoPrivatiFinale = applyRettifica(prezzoPrivatiBase, quote.rettificaPrivati);

  return {
    sezioni: {
      materiali: totMateriali,
      supporti: totSupporti,
      legno: totLegno,
      lavorazioni: totLavorazioni,
      manodopera: totManodopera,
    },
    righeMateriali,
    riepilogoMateriePrime,
    riepilogoAltriCosti,
    supplementiAMargine,
    supplementiSenzaMargine,
    costoTotale,
    prezzoListinoBase,
    prezzoPrivatiBase,
    prezzoListinoFinale,
    prezzoPrivatiFinale,
  };
}

function applyRettifica(base: number, r: Quote['rettificaListino']): number {
  if (!r || r.valore === 0) return base;
  if (r.tipo === 'assoluto') return base + r.valore; // Excel B93 = B90 + A93
  return mround(base * (1 + r.valore), 10); // Excel B94 = MROUND(B90*(1+A94),10)
}
