import { SectionShell } from '@/components/primitives';
import { TextArea, TextField } from '@/components/fields';
import { useQuoteStore } from '@/app/store';
import type { QuoteHeader } from '@/domain/types';

export function AnagraficaSection() {
  const header = useQuoteStore((s) => s.quote.header);
  const updateQuote = useQuoteStore((s) => s.updateQuote);

  const set = <K extends keyof QuoteHeader>(key: K, value: QuoteHeader[K]) =>
    updateQuote((q) => {
      q.header[key] = value;
    });

  return (
    <SectionShell
      id="anagrafica"
      index="01"
      title="Anagrafica preventivo"
      description="Intestazione e riferimenti del documento."
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
        <TextField label="Data" type="date" value={header.data} onChange={(v) => set('data', v)} />
        <TextField
          label="Versione"
          value={header.versione}
          onChange={(v) => set('versione', v)}
          placeholder="1"
        />
        <TextField
          label="Intestazione cliente"
          value={header.intestazioneCliente}
          onChange={(v) => set('intestazioneCliente', v)}
          placeholder="Nome cliente o ragione sociale"
          className="md:col-span-2"
        />
        <TextField
          label="Venditore"
          value={header.venditore}
          onChange={(v) => set('venditore', v)}
          placeholder="Nome venditore"
        />
        <TextField
          label="Riferimento"
          value={header.riferimento}
          onChange={(v) => set('riferimento', v)}
          placeholder="Rif. commessa / progetto"
        />
        <TextField
          label="Focolare"
          value={header.focolare}
          onChange={(v) => set('focolare', v)}
          placeholder="Modello focolare"
          className="md:col-span-2"
        />
        <TextArea
          label="Richieste particolari del cliente"
          value={header.richiesteParticolari}
          onChange={(v) => set('richiesteParticolari', v)}
          className="md:col-span-2"
        />
        <TextArea
          label="Note interne"
          value={header.note}
          onChange={(v) => set('note', v)}
          className="md:col-span-2"
        />
      </div>
    </SectionShell>
  );
}
