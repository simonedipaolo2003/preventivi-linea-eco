import type {
  LaborTaskRow,
  MaterialRow,
  Quote,
  SchedaClienteData,
  SupportRow,
  WoodRow,
} from '@/domain/types';
import { uid } from '@/lib/id';

export function emptyMaterialRow(kind: MaterialRow['kind'] = 'catalogo'): MaterialRow {
  return { id: uid('mat'), kind, mq: 0 };
}

export function emptySupportRow(etichetta = ''): SupportRow {
  return { id: uid('sup'), etichetta, mq: 0 };
}

export function emptyWoodRow(kind: WoodRow['kind'] = 'soglia'): WoodRow {
  return { id: uid('leg'), kind, quantita: 0 };
}

export function emptyLaborExtra(): LaborTaskRow {
  return { id: uid('lab'), kind: 'extra', etichetta: '', ore: 0, costoOrarioManuale: 0 };
}

/** Le tre mansioni standard sempre presenti (con le ore tipiche dell'Excel). */
function defaultLabor(): LaborTaskRow[] {
  return [
    { id: uid('lab'), kind: 'progettazione', etichetta: 'Progettazione', ore: 0 },
    { id: uid('lab'), kind: 'messaInLavorazione', etichetta: 'Messa in lavorazione', ore: 0 },
    { id: uid('lab'), kind: 'produzione', etichetta: 'Lavorazione / produzione', ore: 0 },
  ];
}

/** Dati vuoti della scheda cliente (brochure commerciale). */
export function createEmptySchedaCliente(): SchedaClienteData {
  return {
    baseTitolo: 'Prodotto base',
    baseNome: '',
    baseDescrizione: '',
    basePrezzo: 0,
    baseDettagli: '',
    rivTitolo: 'Rivestimento',
    rivDescrizione: '',
    rivPrezzo: 0,
    rivDettagli: '',
    rivFoto: [],
    rivRender: [],
    notePrezzi: '',
    mostraTotale: true,
  };
}

export function createEmptyQuote(): Quote {
  return {
    id: uid('quote'),
    stato: 'definitivo',
    schedaCliente: createEmptySchedaCliente(),
    header: {
      data: new Date().toISOString().slice(0, 10),
      intestazioneCliente: '',
      venditore: '',
      riferimento: '',
      focolare: '',
      versione: '1',
      richiesteParticolari: '',
      note: '',
    },
    materiali: [emptyMaterialRow('catalogo')],
    supporti: [
      { id: uid('sup'), etichetta: 'Supporti', mq: 0 },
      { id: uid('sup'), etichetta: 'Sostegni', mq: 0 },
    ],
    legno: [emptyWoodRow('soglia')],
    lavorazioni: [],
    supplementiSpeciali: [],
    manodopera: defaultLabor(),
    altriCostiMateriePrime: [],
    altriCostiProduzione: [],
    supplementiAMargine: [],
    supplementiSenzaMargine: [],
    rettificaListino: { tipo: 'assoluto', valore: 0 },
    rettificaPrivati: { tipo: 'assoluto', valore: 0 },
  };
}
