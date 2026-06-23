import { describe, expect, it } from 'vitest';
import { calcQuote } from './engine';
import { DEFAULT_PRICING_PARAMS } from '@/data/params';
import type { Quote } from '@/domain/types';

/**
 * Fixture che riproduce ESATTAMENTE lo stato del foglio "TOOL LINEA ECO"
 * (riga materiale C.ROMANO fascia 3, supporti 0.82mq, soglia castagno 16cm
 * anticato+spazzolato, manodopera 1+1+12 ore). I valori attesi sono i
 * valori calcolati e memorizzati nell'Excel originale.
 */
const excelQuote: Quote = {
  id: 'test',
  stato: 'bozza',
  header: {
    data: '',
    intestazioneCliente: '',
    venditore: '',
    riferimento: '',
    focolare: '',
    versione: '',
    richiesteParticolari: '',
    note: '',
  },
  materiali: [{ id: 'm1', kind: 'catalogo', materialId: 'classico-romano-i-f-ant-sat', mq: 2.38 }],
  supporti: [{ id: 's1', etichetta: 'SUPPORTI', mq: 0.82 }],
  legno: [
    {
      id: 'l1',
      kind: 'soglia',
      woodId: 'soglia-in-legno-castagno-spessore-16-cm',
      quantita: 200,
      finishId: 'anticato-spazzolato',
    },
  ],
  lavorazioni: [],
  supplementiSpeciali: [],
  manodopera: [
    { id: 't1', kind: 'progettazione', etichetta: 'Progettazione', ore: 1 },
    { id: 't2', kind: 'messaInLavorazione', etichetta: 'Messa in lavorazione', ore: 1 },
    { id: 't3', kind: 'produzione', etichetta: 'Lavorazione/produzione', ore: 12 },
  ],
  altriCostiMateriePrime: [],
  altriCostiProduzione: [],
  supplementiAMargine: [],
  supplementiSenzaMargine: [],
  rettificaListino: { tipo: 'assoluto', valore: 0 },
  rettificaPrivati: { tipo: 'assoluto', valore: 0 },
};

describe('pricing engine (1:1 con Excel TOOL LINEA ECO)', () => {
  const t = calcQuote(excelQuote, DEFAULT_PRICING_PARAMS);

  it('sezione materiali (H17)', () => {
    expect(t.sezioni.materiali).toBeCloseTo(340.34, 4);
  });
  it('sezione supporti (H24)', () => {
    expect(t.sezioni.supporti).toBeCloseTo(41, 4);
  });
  it('sezione legno (H36)', () => {
    expect(t.sezioni.legno).toBeCloseTo(330, 4);
  });
  it('sezione lavorazioni (H48)', () => {
    expect(t.sezioni.lavorazioni).toBeCloseTo(0, 4);
  });
  it('sezione manodopera (H57)', () => {
    expect(t.sezioni.manodopera).toBeCloseTo(294, 4);
  });
  it('costo totale (B88)', () => {
    expect(t.costoTotale).toBeCloseTo(1301.9130480384, 4);
  });
  it('prezzo listino rivenditori MROUND 10 (B90)', () => {
    expect(t.prezzoListinoBase).toBe(4170);
  });
  it('prezzo netto privati MROUND 10 (G90)', () => {
    expect(t.prezzoPrivatiBase).toBe(2600);
  });

  it('frido applicato solo a riga catalogo (G10 = 78.54)', () => {
    expect(t.righeMateriali[0].frido).toBeCloseTo(78.54, 4);
    expect(t.righeMateriali[0].prezzo).toBeCloseTo(261.8, 4);
  });

  it('rettifica assoluta somma al prezzo base', () => {
    const q = { ...excelQuote, rettificaListino: { tipo: 'assoluto' as const, valore: 100 } };
    expect(calcQuote(q, DEFAULT_PRICING_PARAMS).prezzoListinoFinale).toBe(4270);
  });
  it('rettifica percentuale con MROUND 10', () => {
    const q = { ...excelQuote, rettificaPrivati: { tipo: 'percentuale' as const, valore: 0.1 } };
    // MROUND(2600*1.1,10) = MROUND(2860,10) = 2860
    expect(calcQuote(q, DEFAULT_PRICING_PARAMS).prezzoPrivatiFinale).toBe(2860);
  });
});
