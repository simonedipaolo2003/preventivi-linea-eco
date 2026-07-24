// ============================================================================
// PREVIEW PRESENTER — pure mapper from the raw Quote domain to a structured,
// render-ready document model (PreviewModel). No React, no styling.
//
// It re-derives the detailed line items from the raw quote, reusing the pricing
// engine's row calculators and projections, so totals stay 1:1 with calcQuote.
// The UI (OutputView / print view) only maps this model to markup.
// ============================================================================
import type { PricingParams, Quote, QuoteTotals, CostLine } from '@/domain/types';
import {
  getMaterial,
  getWood,
  getWoodFinish,
  getSpecialWork,
  getSpecialSupplement,
  prezzoPerFascia,
} from '@/domain/catalog';
import {
  calcMaterialRow,
  calcSupportRow,
  calcWoodRow,
  calcSpecialWorkRow,
  calcSpecialSupplementRow,
  calcLaborRow,
  projectCost,
} from '@/domain/pricing/engine';
import { formatEur, formatNumber } from '@/lib/money';

export type PreviewMode = 'interna' | 'cliente';

/** Una riga del documento: voce primaria o sottovoce di dettaglio. */
export interface PreviewRow {
  label: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  cost?: number;
  listino?: number;
  privati: number;
  /** Voce primaria di sezione (grassetto leggero). */
  emphasis?: boolean;
  /** Voce sempre visibile anche se a importo zero (es. totali chiave). */
  keyRow?: boolean;
  /** Visibile nella vista cliente. */
  showInClient: boolean;
  children?: PreviewRow[];
}

export interface PreviewSubtotal {
  cost: number;
  listino: number;
  privati: number;
}

export interface PreviewBlock {
  id: string;
  title: string;
  rows: PreviewRow[];
  subtotal?: PreviewSubtotal;
  showInClient: boolean;
}

export interface PreviewTotals {
  costoTotale: number;
  prezzoListinoBase: number;
  prezzoPrivatiBase: number;
  prezzoListinoFinale: number;
  prezzoPrivatiFinale: number;
  rettificaListino: number;
  rettificaPrivati: number;
}

export interface PreviewMetadata {
  cliente: string;
  data: string;
  riferimento: string;
  versione: string;
  focolare: string;
  venditore: string;
  stato: Quote['stato'];
  richiesteParticolari: string;
}

export interface PreviewModel {
  metadata: PreviewMetadata;
  blocks: PreviewBlock[];
  totals: PreviewTotals;
}

// ---- helpers ---------------------------------------------------------------

const fasciaLabel = (f: string | number) => `Fascia ${f}`;

const sumLines = (lines: CostLine[]): PreviewSubtotal => ({
  cost: lines.reduce((a, l) => a + l.costo, 0),
  listino: lines.reduce((a, l) => a + l.listino, 0),
  privati: lines.reduce((a, l) => a + l.privati, 0),
});

/** Costruisce una PreviewRow proiettando un costo grezzo nelle tre colonne. */
function row(
  label: string,
  costo: number,
  params: PricingParams,
  extra: Partial<PreviewRow> = {},
): PreviewRow {
  const p = projectCost(costo, params);
  return {
    label,
    cost: p.costo,
    listino: p.listino,
    privati: p.privati,
    showInClient: extra.showInClient ?? true,
    ...extra,
  };
}

/** Una riga è visibile se ha importo o è marcata come voce chiave. */
const visible = (r: PreviewRow) => r.keyRow || (r.privati ?? 0) > 0 || (r.cost ?? 0) > 0;

// ---- builder ---------------------------------------------------------------

export function buildPreview(
  quote: Quote,
  params: PricingParams,
  totals: QuoteTotals,
  _mode: PreviewMode,
): PreviewModel {
  const blocks: PreviewBlock[] = [];

  // --- BLOCCO 1 · MATERIE PRIME --------------------------------------------
  const materieRows: PreviewRow[] = [];

  // Materiali
  const materialiChildren: PreviewRow[] = quote.materiali
    .map((m) => {
      const r = calcMaterialRow(m, params);
      if (m.kind === 'catalogo') {
        const mat = getMaterial(m.materialId);
        if (!mat) return null;
        const fridoPct = Math.round(params.frido * 100);
        const desc = `${fasciaLabel(mat.fascia)} · ${formatNumber(m.mq)} m² × ${formatNumber(
          prezzoPerFascia(mat.fascia),
        )} €/m²${r.frido > 0 ? ` · Frido +${fridoPct}%` : ''}`;
        return row(mat.descrizione, r.totale, params, {
          description: desc,
          quantity: m.mq,
          unit: 'm²',
          unitPrice: r.prezzoMq,
        });
      }
      const aCorpo = (m.aCorpo ?? 0) > 0;
      const desc = aCorpo
        ? 'A corpo'
        : `${formatNumber(m.mq)} m² × ${formatNumber(m.prezzoMqManuale ?? 0)} €/m²`;
      return row(m.descrizione || 'Materiale extra', r.totale, params, { description: desc });
    })
    .filter((r): r is PreviewRow => r !== null && visible(r));

  if (totals.sezioni.materiali > 0)
    materieRows.push(
      row('Materiali', totals.sezioni.materiali, params, {
        children: materialiChildren,
        emphasis: true,
      }),
    );

  // Supporti e sostegni
  const supportiChildren: PreviewRow[] = quote.supporti
    .map((s) => {
      const costo = calcSupportRow(s, params);
      const prezzo = s.prezzoOverride ?? params.supportiPrezzoMq;
      return row(s.etichetta || 'Supporto', costo, params, {
        description: `${formatNumber(s.mq)} m² × ${formatNumber(prezzo)} €/m²`,
        quantity: s.mq,
        unit: 'm²',
        unitPrice: prezzo,
      });
    })
    .filter(visible);
  if (totals.sezioni.supporti > 0)
    materieRows.push(
      row('Supporti e sostegni', totals.sezioni.supporti, params, {
        children: supportiChildren,
        emphasis: true,
      }),
    );

  // Parti e componenti in legno
  const legnoChildren: PreviewRow[] = quote.legno
    .map((w) => {
      const r = calcWoodRow(w);
      if (w.kind === 'soglia') {
        const wood = getWood(w.woodId);
        if (!wood) return null;
        const finish = getWoodFinish(w.finishId);
        const finishLabel =
          finish && finish.variazione > 0 ? ` · ${finish.nome.toLowerCase()}` : '';
        return row(wood.nome, r.totale, params, {
          description: `${formatNumber(w.quantita)} cm × ${formatNumber(
            wood.prezzoCm,
          )} €/cm${finishLabel}`,
          quantity: w.quantita,
          unit: 'cm',
          unitPrice: wood.prezzoCm,
        });
      }
      return row(w.descrizione || 'Componente in legno', r.totale, params, {
        description: `${formatNumber(w.quantita)} × ${formatNumber(w.prezzoUnitario ?? 0)} €`,
      });
    })
    .filter((r): r is PreviewRow => r !== null && visible(r));
  if (totals.sezioni.legno > 0)
    materieRows.push(
      row('Parti e componenti in legno', totals.sezioni.legno, params, {
        children: legnoChildren,
        emphasis: true,
      }),
    );

  // Ciottoli, mattoni e lavorazioni speciali
  const lavorChildren: PreviewRow[] = [];
  quote.lavorazioni.forEach((l) => {
    const costo = calcSpecialWorkRow(l);
    const work = getSpecialWork(l.laborId);
    if (!work) return;
    const r = row(`${work.tipologia} · ${work.materiale}`, costo, params, {
      description: `${formatNumber(l.quantita)} ${work.um.toLowerCase()} × ${formatNumber(
        work.prezzo,
      )} €/${work.um.toLowerCase()}${
        l.angoli > 0 ? ` · ${l.angoli} angoli a vista` : ''
      }`,
    });
    if (visible(r)) lavorChildren.push(r);
  });
  quote.supplementiSpeciali.forEach((s) => {
    const costo = calcSpecialSupplementRow(s);
    const def = getSpecialSupplement(s.supplementId);
    if (!def) return;
    const r = row(def.nome, costo, params, { description: def.note });
    if (visible(r)) lavorChildren.push(r);
  });
  if (totals.sezioni.lavorazioni > 0)
    materieRows.push(
      row('Ciottoli, mattoni e lavorazioni speciali', totals.sezioni.lavorazioni, params, {
        children: lavorChildren,
        emphasis: true,
      }),
    );

  // Altri costi a corpo · materie prime
  quote.altriCostiMateriePrime.forEach((a) => {
    if (a.importo === 0) return;
    materieRows.push(row(a.etichetta || 'Voce a corpo', a.importo, params, { emphasis: true }));
  });

  blocks.push({
    id: 'materie-prime',
    title: 'Materie prime e lavorazioni',
    rows: materieRows,
    subtotal: sumLines(totals.riepilogoMateriePrime),
    showInClient: true,
  });

  // --- BLOCCO 2 · ALTRI COSTI ----------------------------------------------
  const altriRows: PreviewRow[] = [];
  const laborByKind = (kind: string) =>
    quote.manodopera.filter((t) => t.kind === kind).reduce((a, t) => a + calcLaborRow(t, params), 0);
  const oreByKind = (kind: string) =>
    quote.manodopera.filter((t) => t.kind === kind).reduce((a, t) => a + t.ore, 0);
  // Dato che genera il costo: ore × costo orario (es. "4 h × 35,00 €/h").
  const laborDesc = (ore: number, rate: number) =>
    `${formatNumber(ore)} h × ${formatEur(rate)}/h`;

  const progettazione = laborByKind('progettazione');
  const messa = laborByKind('messaInLavorazione');
  const produzione = laborByKind('produzione');

  if (progettazione > 0)
    altriRows.push(
      row('Progettazione', progettazione, params, {
        showInClient: true,
        description: laborDesc(oreByKind('progettazione'), params.costoOrarioProgettazione),
      }),
    );
  if (messa > 0)
    altriRows.push(
      row('Messa in lavorazione', messa, params, {
        showInClient: true,
        description: laborDesc(oreByKind('messaInLavorazione'), params.costoOrarioMessaInLavorazione),
      }),
    );
  if (produzione > 0)
    altriRows.push(
      row('Lavorazione e produzione', produzione, params, {
        showInClient: true,
        description: laborDesc(oreByKind('produzione'), params.costoOrarioProduzione),
      }),
    );
  quote.manodopera
    .filter((t) => t.kind === 'extra')
    .forEach((t) => {
      const costo = calcLaborRow(t, params);
      if (costo > 0)
        altriRows.push(
          row(t.etichetta || 'Manodopera extra', costo, params, {
            showInClient: true,
            description: laborDesc(t.ore, t.costoOrarioManuale ?? 0),
          }),
        );
    });

  // consumo / imballaggio / costi fissi + altri costi a corpo produzione:
  // arrivano già pronti dal riepilogo engine (riga 0 = aggregato manodopera, saltata).
  totals.riepilogoAltriCosti.slice(1).forEach((l) => {
    if (l.costo === 0) return;
    altriRows.push({
      label: l.etichetta,
      cost: l.costo,
      listino: l.listino,
      privati: l.privati,
      showInClient: false, // overhead interno: non mostrato al cliente
    });
  });

  blocks.push({
    id: 'altri-costi',
    title: 'Progettazione, manodopera e costi',
    rows: altriRows.filter(visible),
    subtotal: sumLines(totals.riepilogoAltriCosti),
    showInClient: false,
  });

  // --- BLOCCO 3 · SUPPLEMENTI ----------------------------------------------
  const supplRows: PreviewRow[] = [
    ...totals.supplementiAMargine,
    ...totals.supplementiSenzaMargine,
  ]
    .filter((l) => l.costo !== 0 || l.privati !== 0)
    .map((l) => ({
      label: l.etichetta,
      cost: l.costo,
      listino: l.listino,
      privati: l.privati,
      showInClient: false,
    }));

  if (supplRows.length > 0)
    blocks.push({
      id: 'supplementi',
      title: 'Supplementi e garanzia',
      rows: supplRows,
      subtotal: sumLines([...totals.supplementiAMargine, ...totals.supplementiSenzaMargine]),
      showInClient: false,
    });

  return {
    metadata: {
      cliente: quote.header.intestazioneCliente,
      data: quote.header.data,
      riferimento: quote.header.riferimento,
      versione: quote.header.versione,
      focolare: quote.header.focolare,
      venditore: quote.header.venditore,
      stato: quote.stato,
      richiesteParticolari: quote.header.richiesteParticolari,
    },
    blocks,
    totals: {
      costoTotale: totals.costoTotale,
      prezzoListinoBase: totals.prezzoListinoBase,
      prezzoPrivatiBase: totals.prezzoPrivatiBase,
      prezzoListinoFinale: totals.prezzoListinoFinale,
      prezzoPrivatiFinale: totals.prezzoPrivatiFinale,
      rettificaListino: quote.rettificaListino?.valore ?? 0,
      rettificaPrivati: quote.rettificaPrivati?.valore ?? 0,
    },
  };
}
