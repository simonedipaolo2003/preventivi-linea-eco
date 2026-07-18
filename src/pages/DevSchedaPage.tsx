// ============================================================================
// DevSchedaPage — harness SOLO-DEV per lavorare sul template "Scheda cliente"
// senza toccare Supabase (niente auth, niente lock, niente archivio reale).
// Renderizza SchedaClienteView con dati mock; le immagini usano path "dev:"
// risolti in placeholder locali da imagesRepo.objectUrl (vedi
// devPlaceholders.ts). La route è registrata solo con import.meta.env.DEV:
// in produzione questo file non entra nel bundle.
// ============================================================================
import { useMemo } from 'react';
import { createEmptyQuote } from '@/domain/quoteFactory';
import type { Quote } from '@/domain/types';
import { SchedaClienteView } from '@/features/SchedaClienteView';

// ---- Quote mock -------------------------------------------------------------
// full   → contenuti abbondanti (2 pagine in stampa)
// light  → hero + render wide (~1,8 pagine: resta su 2, sforo netto)
// fit    → sforo lieve oltre una pagina: deve attivare la modalità compatta
// legacy → baseTitolo storico "Prodotto base" nel JSONB: la view lo normalizza
function mockQuote(variant: 'full' | 'light' | 'fit' | 'legacy'): Quote {
  const q = createEmptyQuote();
  q.header = {
    ...q.header,
    data: '2026-07-18',
    intestazioneCliente: 'Fam. Bianchi',
    riferimento: 'Arch. De Santis',
    focolare: 'Focolare 80 Piano',
    versione: '2',
  };
  q.schedaCliente = {
    baseTitolo: 'Interno',
    baseNome: 'Linea Eco 80',
    baseDescrizione:
      'Monoblocco a legna con camera di combustione in refrattario ad alta densità e vetro ceramico autopulente. Canalizzazione predisposta, resa termica certificata per ambienti fino a 90 m².',
    basePrezzo: 4890,
    baseDettagli: 'Lavorazione inclusa\nTrasporto incluso\nPosa esclusa',
    baseImagePath: 'dev:interno-hero',
    rivTitolo: 'Rivestimento',
    rivDescrizione:
      'Rivestimento su misura in pietra Serena spazzolata con boiserie laterale in rovere termotrattato. Piano fuoco monolitico, spessore 4 cm, con giunti a scomparsa.',
    rivPrezzo: 7350,
    rivDettagli: 'Pietra Serena spazzolata\nRovere termotrattato\nPosa e assistenza incluse',
    rivFoto:
      variant === 'full'
        ? [
            { id: 'f1', path: 'dev:pietra-serena' },
            { id: 'f2', path: 'dev:rovere' },
            { id: 'f3', path: 'dev:dettaglio-giunto' },
          ]
        : [{ id: 'f1', path: 'dev:pietra-serena' }],
    rivRender: variant === 'fit' ? [] : [{ id: 'r1', path: 'dev:render-ambiente' }],
    notePrezzi: 'IVA esclusa · offerta valida 60 giorni',
    mostraTotale: true,
  };
  if (variant === 'legacy') {
    // Preventivo salvato prima del rename: nel JSONB c'è ancora il vecchio
    // titolo. La view deve normalizzarlo a "Interno".
    q.schedaCliente.baseTitolo = 'Prodotto base';
  }
  if (variant === 'fit') {
    // Testi più corti: l'altezza naturale sfora la pagina di poco (~5–15%).
    q.schedaCliente.baseDescrizione =
      'Monoblocco a legna con camera di combustione in refrattario ad alta densità e vetro ceramico autopulente.';
    q.schedaCliente.rivDescrizione =
      'Rivestimento su misura in pietra Serena spazzolata con boiserie laterale in rovere termotrattato.';
    q.schedaCliente.baseDettagli = 'Lavorazione e trasporto inclusi';
    q.schedaCliente.rivDettagli = 'Posa e assistenza incluse';
  }
  return q;
}

export function DevSchedaPage() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('v');
  const variant = v === 'light' || v === 'fit' || v === 'legacy' ? v : 'full';
  const quote = useMemo(() => mockQuote(variant), [variant]);

  return (
    <div className="min-h-screen bg-chalk py-10">
      <p className="no-print mx-auto mb-4 max-w-3xl text-xs text-ink-faint">
        Harness dev — <a className="underline" href="/dev/scheda?v=full">full</a> ·{' '}
        <a className="underline" href="/dev/scheda?v=light">light</a> ·{' '}
        <a className="underline" href="/dev/scheda?v=fit">fit</a>
      </p>
      <article className="print-page mx-auto max-w-3xl rounded-sm bg-paper px-12 py-12 shadow-panel print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <SchedaClienteView quote={quote} />
      </article>
    </div>
  );
}
