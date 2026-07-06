// ============================================================================
// Generazione PDF lato client.
// Cattura l'elemento del documento (l'anteprima già impaginata) con html2canvas
// e lo mette su UNA SOLA pagina con jsPDF: la pagina ha larghezza A4 e altezza
// pari al contenuto, così l'intero preventivo resta su un unico foglio anche
// con molti materiali/sezioni (nessuna spezzatura su più pagine).
// Restituisce un Blob (per upload nello storage) e, opzionalmente, scarica.
// ============================================================================
// jspdf/html2canvas sono pesanti: caricati on-demand (dynamic import) così
// restano fuori dal bundle iniziale e si scaricano solo al primo export.
const A4_WIDTH_PT = 595.28; // 210mm @ 72dpi

/** Slug per nomi file: "Rossi Mario" → "rossi-mario". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Nome file PDF: preventivo-cliente-data[-interna].pdf */
export function pdfFilename(cliente: string, data: string, suffix?: string): string {
  const parts = ['preventivo', slugify(cliente) || 'cliente', slugify(data)];
  if (suffix) parts.push(suffix);
  return parts.filter(Boolean).join('-') + '.pdf';
}

/**
 * Renderizza un elemento DOM in un PDF a pagina unica.
 * La pagina ha larghezza A4 e altezza proporzionale al contenuto, così tutto
 * il preventivo entra in un solo foglio senza spezzature.
 * @returns Blob del PDF generato.
 */
export async function elementToPdfBlob(el: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(el, {
    scale: 2, // nitidezza su display retina / stampa
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Larghezza fissa A4; altezza della pagina = altezza del contenuto in scala.
  const imgWidth = A4_WIDTH_PT;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Pagina singola dimensionata sul contenuto: niente addPage, nessuna
  // spezzatura, il documento resta su un unico foglio.
  const pdf = new jsPDF({
    unit: 'pt',
    format: [imgWidth, imgHeight],
    orientation: 'portrait',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

  return pdf.output('blob');
}

/** Avvia il download di un Blob nel browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
