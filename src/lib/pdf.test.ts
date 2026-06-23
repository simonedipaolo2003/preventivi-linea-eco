import { describe, it, expect } from 'vitest';
import { slugify, pdfFilename } from './pdf';

describe('slugify', () => {
  it('abbassa, traslittera accenti e unisce con trattini', () => {
    expect(slugify('Rossi Mario')).toBe('rossi-mario');
    expect(slugify('Caffè & Cioccolato')).toBe('caffe-cioccolato');
    expect(slugify('  spazi   multipli ')).toBe('spazi-multipli');
  });

  it('rimuove i trattini iniziali/finali', () => {
    expect(slugify('--ciao--')).toBe('ciao');
    expect(slugify('!!!')).toBe('');
  });
});

describe('pdfFilename', () => {
  it('compone preventivo-cliente-data.pdf', () => {
    expect(pdfFilename('Rossi Mario', '2026-06-19')).toBe(
      'preventivo-rossi-mario-2026-06-19.pdf',
    );
  });

  it('usa fallback "cliente" se vuoto e accetta un suffisso', () => {
    expect(pdfFilename('', '2026-06-19', 'interna')).toBe(
      'preventivo-cliente-2026-06-19-interna.pdf',
    );
  });
});
