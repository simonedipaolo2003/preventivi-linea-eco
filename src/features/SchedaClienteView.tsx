// ============================================================================
// SchedaClienteView — template "Scheda cliente": brochure-preventivo
// commerciale da inviare al cliente finale. Separato dai template tecnici
// (anteprima interna / anteprima cliente), che restano invariati.
//
// Layout: header logo/meta → Prodotto base (testo+prezzo | foto) →
// Rivestimento (testo+prezzo | foto e render nella stessa sezione) →
// riepilogo prezzi. Ogni blocco collassa con grazia se mancano contenuti
// o immagini; break-inside-avoid tiene uniti testo/prezzo/immagini in stampa.
// ============================================================================
import { useMemo } from 'react';
import type { Quote, SchedaImage } from '@/domain/types';
import { createEmptySchedaCliente } from '@/domain/quoteFactory';
import { StorageImg, useStorageImage } from '@/components/StorageImage';
import { BrandLogo } from '@/components/BrandLogo';
import { formatEur0 } from '@/lib/money';

export function SchedaClienteView({ quote }: { quote: Quote }) {
  const s = quote.schedaCliente ?? createEmptySchedaCliente();
  const h = quote.header;

  const modello = s.baseNome.trim() || h.focolare;
  const dataDoc = formatDate(h.data);
  const totale = s.basePrezzo + s.rivPrezzo;

  // Foto e render vivono nella stessa sezione: prima le foto reali, poi i
  // render (con caption discreta). Nessuna sezione autonoma "Render".
  const rivImages = useMemo<{ img: SchedaImage; render: boolean }[]>(
    () => [
      ...s.rivFoto.map((img) => ({ img, render: false })),
      ...s.rivRender.map((img) => ({ img, render: true })),
    ],
    [s.rivFoto, s.rivRender],
  );

  return (
    <div className="font-sans">
      {/* ---- Header ---------------------------------------------------------- */}
      <header className="mb-12 flex items-start justify-between gap-10 break-inside-avoid">
        <BrandLogo className="h-14 w-auto max-w-[240px] object-contain" />
        <div className="text-right">
          <p className="label-eyebrow">Preventivo</p>
          <h1 className="mt-1.5 font-serif text-[1.9rem] leading-tight text-ink">
            {h.intestazioneCliente || 'Cliente'}
          </h1>
          <div className="mt-3 space-y-0.5 text-[13px] leading-relaxed text-ink-muted">
            {modello && <p>Modello {modello}</p>}
            {h.riferimento && <p>Riferimento {h.riferimento}</p>}
            <p className="tnum">
              {dataDoc}
              {h.versione && <> · Versione {h.versione}</>}
            </p>
          </div>
        </div>
      </header>

      {/* ---- Prodotto base --------------------------------------------------- */}
      <Sezione
        titolo={s.baseTitolo || 'Prodotto base'}
        nome={modello}
        descrizione={s.baseDescrizione}
        prezzo={s.basePrezzo}
        dettagli={s.baseDettagli}
        media={
          s.baseImagePath ? (
            <StorageImg
              path={s.baseImagePath}
              className="max-h-[340px] w-full rounded-xl2 object-cover"
            />
          ) : null
        }
      />

      {/* ---- Rivestimento (foto + render nello stesso blocco) ----------------- */}
      <Sezione
        titolo={s.rivTitolo || 'Rivestimento'}
        descrizione={s.rivDescrizione}
        prezzo={s.rivPrezzo}
        dettagli={s.rivDettagli}
        media={rivImages.length > 0 ? <Galleria images={rivImages} /> : null}
      />

      {/* ---- Riepilogo prezzi ------------------------------------------------- */}
      <section className="mt-12 break-inside-avoid border-t border-ink/10 pt-8">
        <div className="space-y-2.5">
          <RigaPrezzo label={s.baseTitolo || 'Prodotto base'} value={s.basePrezzo} />
          <RigaPrezzo label={s.rivTitolo || 'Rivestimento'} value={s.rivPrezzo} />
        </div>
        {s.mostraTotale && (
          <div className="mt-5 flex items-end justify-between gap-6 border-t border-ink/10 pt-5">
            <div>
              <p className="label-eyebrow">Totale</p>
              {s.notePrezzi && <p className="mt-1 text-xs text-ink-muted">{s.notePrezzi}</p>}
            </div>
            <p className="tnum font-serif text-[2.6rem] leading-none text-ink">
              {formatEur0(totale)}
            </p>
          </div>
        )}
        {!s.mostraTotale && s.notePrezzi && (
          <p className="mt-4 text-xs text-ink-muted">{s.notePrezzi}</p>
        )}
      </section>
    </div>
  );
}

// ---- Sezione a due colonne (testo+prezzo | media) ---------------------------
function Sezione({
  titolo,
  nome,
  descrizione,
  prezzo,
  dettagli,
  media,
}: {
  titolo: string;
  nome?: string;
  descrizione: string;
  prezzo: number;
  dettagli: string;
  media: React.ReactNode;
}) {
  const dettagliRighe = dettagli
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

  const testo = (
    <div>
      <p className="label-eyebrow">{titolo}</p>
      {nome && <h2 className="mt-2 font-serif text-[1.35rem] leading-snug text-ink">{nome}</h2>}
      {descrizione && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
          {descrizione}
        </p>
      )}
      <p className="tnum mt-5 font-serif text-[2rem] leading-none text-ink">{formatEur0(prezzo)}</p>
      {dettagliRighe.length > 0 && (
        <ul className="mt-3 space-y-1">
          {dettagliRighe.map((r, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-muted">
              <span className="text-ink-faint">·</span>
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // Senza media il testo occupa tutta la larghezza: mai colonne vuote.
  if (!media) {
    return <section className="mb-12 break-inside-avoid">{testo}</section>;
  }
  return (
    <section className="mb-12 grid grid-cols-[1fr_1.05fr] items-start gap-9 break-inside-avoid">
      {testo}
      <div>{media}</div>
    </section>
  );
}

// ---- Galleria rivestimento --------------------------------------------------
// 1 immagine → grande; 2+ → hero + griglia a 2 colonne. Ordine: foto, render.
function Galleria({ images }: { images: { img: SchedaImage; render: boolean }[] }) {
  const [hero, ...rest] = images;
  return (
    <div className="space-y-2.5">
      <Figura item={hero} className="max-h-[300px] w-full rounded-xl2 object-cover" />
      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {rest.map((it) => (
            <Figura
              key={it.img.id}
              item={it}
              className="h-[130px] w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Figura({
  item,
  className,
}: {
  item: { img: SchedaImage; render: boolean };
  className: string;
}) {
  const url = useStorageImage(item.img.path);
  if (!url) return null;
  return (
    <figure className="break-inside-avoid">
      <img src={url} className={className} alt="" />
      {item.render && (
        <figcaption className="mt-1 text-right text-2xs uppercase tracking-label text-ink-faint">
          Render
        </figcaption>
      )}
    </figure>
  );
}

// ---- Prezzi -----------------------------------------------------------------
function RigaPrezzo({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="tnum text-base font-medium text-ink">{formatEur0(value)}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('it-IT');
}
