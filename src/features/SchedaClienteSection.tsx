// ============================================================================
// SchedaClienteSection — editor dei contenuti della "Scheda cliente"
// (brochure commerciale). Testi, prezzi e upload immagini: logo, foto
// dell'interno, foto e render del rivestimento. Le immagini vengono
// ridimensionate lato client e caricate nello Storage; nel preventivo
// viaggia solo il path (l'autosave resta leggero).
// ============================================================================
import { useRef, useState } from 'react';
import { SectionShell, EmptyHint } from '@/components/primitives';
import { NumberField, TextArea, TextField } from '@/components/fields';
import { StorageImg } from '@/components/StorageImage';
import { useQuoteStore } from '@/app/store';
import { useToast } from '@/components/Toast';
import { imagesRepo } from '@/data/repositories';
import { downscaleImage } from '@/lib/image';
import { createEmptySchedaCliente } from '@/domain/quoteFactory';
import { uid } from '@/lib/id';
import type { SchedaClienteData } from '@/domain/types';

export function SchedaClienteSection() {
  const quote = useQuoteStore((s) => s.quote);
  const updateQuote = useQuoteStore((s) => s.updateQuote);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const s = quote.schedaCliente ?? createEmptySchedaCliente();

  // I preventivi salvati prima di questa funzionalità non hanno il campo:
  // lo si crea alla prima modifica.
  const patch = (fn: (d: SchedaClienteData) => void) =>
    updateQuote((q) => {
      if (!q.schedaCliente) q.schedaCliente = createEmptySchedaCliente();
      fn(q.schedaCliente);
    });

  const uploadImage = async (file: File, maxDim: number): Promise<string | null> => {
    setBusy(true);
    try {
      const { blob, contentType } = await downscaleImage(file, maxDim);
      return await imagesRepo.upload({ blob, contentType, quoteKey: quote.id });
    } catch {
      toast.error('Caricamento immagine non riuscito. Riprova.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const removeImage = (path: string) => {
    imagesRepo.remove(path).catch(() => undefined);
  };

  return (
    <SectionShell
      id="scheda"
      index="08"
      title="Scheda cliente"
      description="Contenuti della brochure commerciale: interno, rivestimento, immagini e prezzi dedicati al cliente finale. Si esporta dall'anteprima scegliendo «Scheda cliente»."
    >
      {/* ---- Interno --------------------------------------------------- */}
      <div className="mb-9">
        <h3 className="label-eyebrow mb-4">Interno</h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TextField
            label="Nome prodotto / modello"
            value={s.baseNome}
            onChange={(v) => patch((d) => (d.baseNome = v))}
            placeholder="Se vuoto usa il campo Focolare"
          />
          <NumberField
            label="Prezzo interno"
            value={s.basePrezzo}
            onChange={(v) => patch((d) => (d.basePrezzo = v))}
            suffix="€"
            align="left"
          />
          <TextArea
            label="Descrizione breve"
            value={s.baseDescrizione}
            onChange={(v) => patch((d) => (d.baseDescrizione = v))}
            placeholder="Breve presentazione dell'interno"
            rows={3}
          />
          <TextArea
            label="Dettagli prezzo (una voce per riga)"
            value={s.baseDettagli}
            onChange={(v) => patch((d) => (d.baseDettagli = v))}
            placeholder={'Lavorazione inclusa\nPosa esclusa'}
            rows={3}
          />
        </div>
        <div className="mt-5">
          <span className="field-label">Foto interno</span>
          {s.baseImagePath ? (
            <div className="flex items-start gap-4">
              <StorageImg path={s.baseImagePath} className="h-28 w-40 rounded-lg border border-line object-cover" />
              <RemoveLink
                onClick={() => {
                  const old = s.baseImagePath;
                  patch((d) => (d.baseImagePath = undefined));
                  if (old) removeImage(old);
                }}
              />
            </div>
          ) : (
            <UploadButton
              label="Carica foto"
              disabled={busy}
              onFile={async (f) => {
                const path = await uploadImage(f, 1600);
                if (path) patch((d) => (d.baseImagePath = path));
              }}
            />
          )}
        </div>
      </div>

      {/* ---- Rivestimento ---------------------------------------------------- */}
      <div className="mb-9 border-t border-line/70 pt-8">
        <h3 className="label-eyebrow mb-4">Rivestimento</h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TextArea
            label="Descrizione rivestimento"
            value={s.rivDescrizione}
            onChange={(v) => patch((d) => (d.rivDescrizione = v))}
            placeholder="Materiali, finiture, caratteristiche del rivestimento"
            rows={4}
          />
          <div className="flex flex-col gap-5">
            <NumberField
              label="Prezzo rivestimento"
              value={s.rivPrezzo}
              onChange={(v) => patch((d) => (d.rivPrezzo = v))}
              suffix="€"
              align="left"
            />
            <TextArea
              label="Dettagli sintetici (una voce per riga)"
              value={s.rivDettagli}
              onChange={(v) => patch((d) => (d.rivDettagli = v))}
              rows={2}
            />
          </div>
        </div>

        <ImageList
          label="Foto rivestimento"
          images={s.rivFoto}
          disabled={busy}
          onAdd={async (f) => {
            const path = await uploadImage(f, 1600);
            if (path) patch((d) => d.rivFoto.push({ id: uid('img'), path }));
          }}
          onRemove={(id) => {
            const old = s.rivFoto.find((i) => i.id === id)?.path;
            patch((d) => (d.rivFoto = d.rivFoto.filter((i) => i.id !== id)));
            if (old) removeImage(old);
          }}
        />
        <ImageList
          label="Render"
          hint="Compaiono nella sezione Rivestimento, con didascalia discreta."
          images={s.rivRender}
          disabled={busy}
          onAdd={async (f) => {
            const path = await uploadImage(f, 1600);
            if (path) patch((d) => d.rivRender.push({ id: uid('img'), path }));
          }}
          onRemove={(id) => {
            const old = s.rivRender.find((i) => i.id === id)?.path;
            patch((d) => (d.rivRender = d.rivRender.filter((i) => i.id !== id)));
            if (old) removeImage(old);
          }}
        />
      </div>

      {/* ---- Prezzi ---------------------------------------------------------- */}
      <div className="border-t border-line/70 pt-8">
        <h3 className="label-eyebrow mb-4">Riepilogo prezzi</h3>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TextField
            label="Note prezzi"
            value={s.notePrezzi}
            onChange={(v) => patch((d) => (d.notePrezzi = v))}
            placeholder="Es. IVA esclusa · consegna inclusa"
          />
          <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={s.mostraTotale}
              onChange={(e) => patch((d) => (d.mostraTotale = e.target.checked))}
              className="h-4 w-4 accent-ink"
            />
            Mostra totale finale (base + rivestimento)
          </label>
        </div>
      </div>
    </SectionShell>
  );
}

// ---- Controlli upload -------------------------------------------------------

function UploadButton({
  label,
  onFile,
  disabled,
}: {
  label: string;
  onFile: (f: File) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        className="group inline-flex items-center gap-2 text-xs font-medium text-ink-muted transition-colors hover:text-accent disabled:opacity-50"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line transition-colors group-hover:border-accent">
          +
        </span>
        {label}
      </button>
    </>
  );
}

function RemoveLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-ink-faint transition-colors hover:text-red-600"
    >
      Rimuovi
    </button>
  );
}

function ImageList({
  label,
  hint,
  images,
  onAdd,
  onRemove,
  disabled,
}: {
  label: string;
  hint?: string;
  images: { id: string; path: string }[];
  onAdd: (f: File) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline gap-3">
        <span className="field-label mb-0">{label}</span>
        {hint && <span className="text-2xs text-ink-faint">{hint}</span>}
      </div>
      {images.length === 0 && <EmptyHint>Nessuna immagine caricata.</EmptyHint>}
      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <StorageImg path={img.path} className="h-24 w-32 rounded-lg border border-line object-cover" />
              <button
                type="button"
                aria-label="Rimuovi immagine"
                onClick={() => onRemove(img.id)}
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-ink-faint opacity-0 shadow-soft transition-opacity hover:text-red-600 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <UploadButton label="Aggiungi immagine" onFile={onAdd} disabled={disabled} />
    </div>
  );
}
