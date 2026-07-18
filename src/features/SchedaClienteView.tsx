// ============================================================================
// SchedaClienteView — template "Scheda cliente": brochure-preventivo
// commerciale da inviare al cliente finale. Separato dai template tecnici
// (anteprima interna / anteprima cliente), che restano invariati.
//
// Layout: header logo/meta → Interno (testo+prezzo | foto) →
// Rivestimento (testo+prezzo | foto e render nella stessa sezione) →
// riepilogo prezzi. Ogni blocco collassa con grazia se mancano contenuti
// o immagini; break-inside-avoid tiene uniti testo/prezzo/immagini in stampa.
//
// Gerarchia visiva: i titoli di sezione sono "kicker" con hairline che corre
// fino al margine destro; i prezzi di sezione sono dati ancorati da una
// micro-label; l'unica headline numerica è il totale finale. I separatori
// crescono di forza verso la chiusura (hairline → regola marcata sul totale).
//
// Paginazione intelligente: se il contenuto sfora di poco l'altezza utile di
// una pagina A4 stampata, il layout passa a spaziature compatte (vedi
// useSmartFit) per restare su un solo foglio; se lo sforo è netto, resta in
// modalità normale e fluisce su due pagine.
// ============================================================================
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Quote, SchedaImage } from '@/domain/types';
import { createEmptySchedaCliente } from '@/domain/quoteFactory';
import { StorageImg, useStorageImage } from '@/components/StorageImage';
import { BrandLogo } from '@/components/BrandLogo';
import { formatEur0 } from '@/lib/money';

// ---- Smart fit --------------------------------------------------------------
// Rapporto altezza/larghezza dell'area utile di una pagina A4 stampata
// (297−16·2 = 265mm utili × 210−15·2 = 180mm utili). Il confronto è relativo
// alla larghezza, quindi vale sia a schermo sia in stampa.
const PAGE_RATIO = 265 / 180;
// Sforo "lieve": fino al 22% oltre la pagina → si tenta il fit compatto.
const OVERFLOW_SOFT = 1.22;
// Isteresi d'uscita: una volta compatto, si torna normale solo ben sotto
// soglia (evita oscillazioni compact↔normal ad ogni rimisura).
const EXIT_RATIO = 0.86;

/**
 * Osserva l'altezza del documento (le immagini arrivano async) e decide se
 * attivare la modalità compatta: spaziature ridotte e media meno alti, senza
 * scalare il testo. Mai attiva per sfori netti (> ~una pagina e un quinto).
 */
function useSmartFit(ref: React.RefObject<HTMLDivElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const w = el.clientWidth;
      const h = el.scrollHeight;
      if (!w || !h) return;
      const ratio = h / w;
      if (!compactRef.current) {
        if (ratio > PAGE_RATIO && ratio <= PAGE_RATIO * OVERFLOW_SOFT) {
          compactRef.current = true;
          setCompact(true);
        }
      } else if (ratio < PAGE_RATIO * EXIT_RATIO) {
        compactRef.current = false;
        setCompact(false);
      }
    };
    const ro = new ResizeObserver(check);
    ro.observe(el);
    check();
    return () => ro.disconnect();
  }, [ref]);

  return compact;
}

export function SchedaClienteView({ quote }: { quote: Quote }) {
  const s = quote.schedaCliente ?? createEmptySchedaCliente();
  const h = quote.header;
  const rootRef = useRef<HTMLDivElement>(null);
  const compact = useSmartFit(rootRef);

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
    <div ref={rootRef} className="font-sans">
      {/* ---- Header ---------------------------------------------------------- */}
      <header
        className={`flex items-start justify-between gap-10 border-b border-ink/10 break-inside-avoid ${
          compact ? 'mb-8 pb-6' : 'mb-12 pb-8'
        }`}
      >
        <div className="pt-0.5">
          <BrandLogo className="h-9 w-auto object-contain" />
        </div>
        <div className="text-right">
          <p className="label-eyebrow">Preventivo</p>
          <h1 className="mt-2 font-serif text-[1.7rem] font-medium leading-tight text-ink">
            {h.intestazioneCliente || 'Cliente'}
          </h1>
          <dl className="mt-4 grid grid-cols-[auto_auto] justify-end gap-x-5 gap-y-1">
            {modello && <MetaRiga label="Modello" value={modello} />}
            {h.riferimento && <MetaRiga label="Riferimento" value={h.riferimento} />}
            <MetaRiga label="Data" value={dataDoc} num />
            {h.versione && <MetaRiga label="Versione" value={h.versione} num />}
          </dl>
        </div>
      </header>

      {/* ---- Interno --------------------------------------------------- */}
      <Sezione
        titolo={s.baseTitolo || 'Interno'}
        nome={modello}
        descrizione={s.baseDescrizione}
        prezzo={s.basePrezzo}
        dettagli={s.baseDettagli}
        compact={compact}
        media={
          s.baseImagePath ? (
            <StorageImg
              path={s.baseImagePath}
              className={`w-full rounded-[10px] object-cover ${
                compact ? 'aspect-[16/10]' : 'aspect-[4/3]'
              }`}
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
        compact={compact}
        media={rivImages.length > 0 ? <Galleria images={rivImages} compact={compact} /> : null}
      />

      {/* ---- Riepilogo prezzi ------------------------------------------------- */}
      <section className={`break-inside-avoid ${compact ? 'mt-9' : 'mt-14'}`}>
        <KickerRule titolo="Riepilogo" />
        <div className={`divide-y divide-line/70 ${compact ? 'mt-3' : 'mt-5'}`}>
          <RigaPrezzo label={s.baseTitolo || 'Interno'} value={s.basePrezzo} compact={compact} />
          <RigaPrezzo label={s.rivTitolo || 'Rivestimento'} value={s.rivPrezzo} compact={compact} />
        </div>
        {s.mostraTotale && (
          <div
            className={`flex items-end justify-between gap-6 border-t-[1.5px] border-ink/40 ${
              compact ? 'mt-4 pt-4' : 'mt-6 pt-6'
            }`}
          >
            <div>
              <p className="label-eyebrow">Totale</p>
              {s.notePrezzi && (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{s.notePrezzi}</p>
              )}
            </div>
            <p className="tnum font-serif text-[2.75rem] font-medium leading-none text-ink">
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

// ---- Header: riga meta label/valore ----------------------------------------
function MetaRiga({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <>
      <dt className="text-2xs uppercase tracking-label text-ink-faint">{label}</dt>
      <dd className={`text-right text-[13px] leading-snug text-ink-soft ${num ? 'tnum' : ''}`}>
        {value}
      </dd>
    </>
  );
}

// ---- Kicker di sezione: eyebrow + hairline fino al margine ------------------
function KickerRule({ titolo }: { titolo: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-2xs font-semibold uppercase tracking-label text-ink-muted">
        {titolo}
      </span>
      <span aria-hidden className="h-px flex-1 bg-ink/10" />
    </div>
  );
}

// ---- Sezione: kicker full-width, poi due colonne (testo+prezzo | media) -----
function Sezione({
  titolo,
  nome,
  descrizione,
  prezzo,
  dettagli,
  media,
  compact,
}: {
  titolo: string;
  nome?: string;
  descrizione: string;
  prezzo: number;
  dettagli: string;
  media: React.ReactNode;
  compact: boolean;
}) {
  const dettagliRighe = dettagli
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

  const testo = (
    <div>
      {nome && (
        <h2 className="font-serif text-[1.55rem] font-medium leading-tight text-ink">{nome}</h2>
      )}
      {descrizione && (
        <p
          className={`whitespace-pre-line text-[13.5px] leading-[1.7] text-ink-soft ${
            nome ? 'mt-3' : ''
          }`}
        >
          {descrizione}
        </p>
      )}
      <div className={compact ? 'mt-4' : 'mt-6'}>
        <p className="text-2xs uppercase tracking-label text-ink-faint">Prezzo</p>
        <p className="tnum mt-1 font-serif text-[1.6rem] leading-none text-ink">
          {formatEur0(prezzo)}
        </p>
        {dettagliRighe.length > 0 && (
          <ul className="mt-3 space-y-1">
            {dettagliRighe.map((r, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-muted">
                <span aria-hidden className="text-ink-faint">
                  –
                </span>
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  return (
    <section className={`break-inside-avoid ${compact ? 'mb-9' : 'mb-14'}`}>
      <KickerRule titolo={titolo} />
      {/* Senza media il testo occupa tutta la larghezza: mai colonne vuote. */}
      {media ? (
        <div
          className={`grid grid-cols-[1fr_1.05fr] items-start gap-10 ${compact ? 'mt-4' : 'mt-6'}`}
        >
          {testo}
          <div>{media}</div>
        </div>
      ) : (
        <div className={compact ? 'mt-4' : 'mt-6'}>{testo}</div>
      )}
    </section>
  );
}

// ---- Galleria rivestimento --------------------------------------------------
// Proporzioni controllate, non altezze fisse: hero 4:3; le secondarie vanno in
// coppie 4:3 su due colonne; la secondaria rimasta spaiata (o unica) chiude a
// tutta larghezza in 16:9 — mai tile orfani con un buco accanto.
// Ordine: foto reali, poi render (stessa composizione, caption discreta).
function Galleria({
  images,
  compact,
}: {
  images: { img: SchedaImage; render: boolean }[];
  compact: boolean;
}) {
  const [hero, ...rest] = images;
  const heroAspect = compact ? 'aspect-[16/10]' : 'aspect-[4/3]';
  const tileAspect = compact ? 'aspect-[16/10]' : 'aspect-[4/3]';
  // Coppie per la griglia; l'eventuale spaiata finale chiude a tutta larghezza.
  const paired = rest.length % 2 === 0 ? rest : rest.slice(0, -1);
  const wide = rest.length % 2 === 0 ? null : rest[rest.length - 1];
  return (
    <div className="space-y-3">
      <Figura item={hero} className={`w-full rounded-[10px] object-cover ${heroAspect}`} />
      {paired.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {paired.map((it) => (
            <Figura
              key={it.img.id}
              item={it}
              className={`w-full rounded-[10px] object-cover ${tileAspect}`}
            />
          ))}
        </div>
      )}
      {wide && (
        <Figura
          item={wide}
          className={`w-full rounded-[10px] object-cover ${
            compact ? 'aspect-[21/9]' : 'aspect-[16/9]'
          }`}
        />
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
        <figcaption className="mt-1.5 flex items-center gap-1.5 text-2xs uppercase tracking-label text-ink-faint">
          <span aria-hidden className="inline-block h-px w-3 bg-ink-faint/60" />
          Render
        </figcaption>
      )}
    </figure>
  );
}

// ---- Prezzi -----------------------------------------------------------------
function RigaPrezzo({
  label,
  value,
  compact,
}: {
  label: string;
  value: number;
  compact: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-6 ${compact ? 'py-2' : 'py-2.5'}`}
    >
      <span className="text-[13.5px] text-ink-soft">{label}</span>
      <span className="tnum text-[15px] font-medium text-ink">{formatEur0(value)}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('it-IT');
}
