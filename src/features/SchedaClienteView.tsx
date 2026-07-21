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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Quote, SchedaImage } from '@/domain/types';
import { createEmptySchedaCliente } from '@/domain/quoteFactory';
import { useStorageImageState } from '@/components/StorageImage';
import { BrandLogo } from '@/components/BrandLogo';
import { formatEur0 } from '@/lib/money';

// ---- Smart fit --------------------------------------------------------------
// Rapporto altezza/larghezza dell'area utile di una pagina A4 stampata
// (297−16·2 = 265mm utili × 210−15·2 = 180mm utili). Il confronto è relativo
// alla larghezza, quindi vale sia a schermo sia in stampa (la larghezza utile
// a schermo — article max-w-3xl meno il padding — coincide a ~1% con quella di
// stampa, così il fit calcolato a video vale anche nel PDF/anteprima).
const PAGE_RATIO = 265 / 180;
// Oltre questo sforo naturale NON si comprime: è multipagina "vera", non un
// eccesso lieve. Implementa "solo se lo sforamento è minimo".
const MAX_FIT_PAGES = 1.7;
// Bersaglio: riempi fino al 99.5% della pagina (margine anti-arrotondamento).
const SAFETY = 0.995;

/** Interpolazione: t=1 → full, t=0 → compact. */
function lerp(compact: number, full: number, t: number): number {
  return compact + (full - compact) * t;
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// Aspect-ratio (w/h) da una FRAZIONE d'altezza interpolata: così l'altezza del
// box (= larghezza × frazione) è lineare in t, condizione per l'interpolazione
// esatta del fit. compactFrac (t=0, più basso) → fullFrac (t=1, più alto).
function aspectByHeight(compactFrac: number, fullFrac: number, t: number): number {
  return 1 / lerp(compactFrac, fullFrac, t);
}
// Immagini standard (interno, hero, tile griglia): 4:3 pieno → più basse al floor.
const imgAspect = (t: number) => aspectByHeight(0.6, 0.75, t);
// Render/immagine wide a tutta larghezza: 16:9 pieno → più bassa al floor.
const wideAspect = (t: number) => aspectByHeight(0.43, 0.5625, t);
// Frazione di larghezza recuperata in altezza da t=1 a t=0 (per la riserva fit).
const IMG_HFD = 0.75 - 0.6;
const WIDE_HFD = 0.5625 - 0.43;

/**
 * Fattore di riempimento t ∈ [0,1] che fa entrare il documento in una sola
 * pagina quando lo sforo è lieve, comprimendo SOLO spazi e immagini (mai il
 * testo). Ogni elemento comprimibile dichiara quanto si accorcia da t=1 a t=0:
 * data-fr = px fissi (spaziature), data-fw = frazione della propria larghezza
 * (altezza immagine). La somma è la "riserva" R; l'altezza è lineare in t, così
 * l'altezza naturale si ricava dallo stato corrente (h1 = misurata + R·(1−t)) e
 * il t che riempie la pagina in un colpo — tutto SINCRONO, senza attese/async
 * che litigano con StrictMode. Un ricalcolo a font caricati affina la stima.
 */
function usePrintFit(ref: React.RefObject<HTMLDivElement | null>, resetSig: string): number {
  const [t, setT] = useState(1);
  // Tick incrementato a font caricati: forza una nuova misura con le metriche
  // tipografiche definitive (il serif arriva in ritardo e cambia le altezze).
  const [fontTick, setFontTick] = useState(0);
  const iterRef = useRef(0);

  useEffect(() => {
    const fr = typeof document !== 'undefined' ? document.fonts?.ready : undefined;
    if (!fr) return;
    let ok = true;
    fr.then(() => {
      if (ok) setFontTick((n) => n + 1);
    });
    return () => {
      ok = false;
    };
  }, []);

  // Riparte il conteggio iterazioni quando cambia il contenuto o i font.
  useLayoutEffect(() => {
    iterRef.current = 0;
  }, [resetSig, fontTick]);

  // Misura DOPO il commit (useLayoutEffect keyed su t): così scrollHeight è
  // sempre coerente col t corrente. L'altezza è lineare in t, quindi dallo
  // stato corrente si ricava il naturale (h1 = misurata + R·(1−t)) e si corregge
  // verso il target; se non è ancora assestato, setT ritriggera → converge in
  // pochi passi. Il cap su iterRef evita cicli patologici.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || iterRef.current > 16) return;
    const w = el.clientWidth;
    if (!w) return;
    const pageH = w * PAGE_RATIO;
    const target = pageH * SAFETY;
    let reserve = 0; // indipendente da t: px fissi + larghezze × frazione
    el.querySelectorAll<HTMLElement>('[data-fr]').forEach((n) => {
      reserve += parseFloat(n.dataset.fr || '0');
    });
    el.querySelectorAll<HTMLElement>('[data-fw]').forEach((n) => {
      reserve += n.clientWidth * parseFloat(n.dataset.fw || '0');
    });
    const measured = el.scrollHeight;
    const h1 = measured + reserve * (1 - t); // altezza naturale (coerente col t)
    let next: number;
    if (h1 <= target || h1 > pageH * MAX_FIT_PAGES || reserve <= 0 || h1 - reserve > target) {
      // Già in pagina, sforo troppo grande, niente da comprimere, o nemmeno il
      // floor basta → nessuna compressione (eventuali 2 pagine).
      next = 1;
    } else {
      // Correzione diretta verso il target dall'altezza REALE corrente:
      // l'errore della stima di R conta solo sul passo, non sul punto fisso.
      next = clamp01(t - (measured - target) / reserve);
    }
    if (Math.abs(next - t) < 0.004) return; // assestato
    iterRef.current += 1;
    setT(next);
  }, [ref, t, fontTick, resetSig]);

  return t;
}

export function SchedaClienteView({ quote }: { quote: Quote }) {
  const s = quote.schedaCliente ?? createEmptySchedaCliente();
  const h = quote.header;
  const rootRef = useRef<HTMLDivElement>(null);

  const modello = s.baseNome.trim() || h.focolare;
  const dataDoc = formatDate(h.data);
  const totale = s.basePrezzo + s.rivPrezzo;

  // I preventivi salvati prima del rename (2026-07-18) hanno nel JSONB il
  // vecchio titolo "Prodotto base": in lettura si normalizza a "Interno".
  const baseTitolo =
    !s.baseTitolo || s.baseTitolo === 'Prodotto base' ? 'Interno' : s.baseTitolo;

  // Foto e render vivono nella stessa sezione: prima le foto reali, poi i
  // render (con caption discreta). Nessuna sezione autonoma "Render".
  const rivImages = useMemo<{ img: SchedaImage; render: boolean }[]>(
    () => [
      ...s.rivFoto.map((img) => ({ img, render: false })),
      ...s.rivRender.map((img) => ({ img, render: true })),
    ],
    [s.rivFoto, s.rivRender],
  );

  // Firma del contenuto che incide sull'altezza: se cambia (nuovo preventivo,
  // testo/immagini editati) la ricerca del fit riparte da capo.
  const resetSig = [
    s.baseDescrizione.length,
    s.rivDescrizione.length,
    s.baseDettagli.length,
    s.rivDettagli.length,
    s.baseImagePath ? 1 : 0,
    rivImages.length,
    s.mostraTotale ? 1 : 0,
    s.notePrezzi.length,
  ].join(':');
  const t = usePrintFit(rootRef, resetSig);

  return (
    <div ref={rootRef} className="font-sans">
      {/* ---- Header ---------------------------------------------------------- */}
      <header
        className="flex items-start justify-between gap-10 border-b border-ink/10 break-inside-avoid"
        style={{ marginBottom: lerp(28, 48, t), paddingBottom: lerp(22, 32, t) }}
        data-fr={20 + 10}
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
        titolo={baseTitolo}
        nome={modello}
        descrizione={s.baseDescrizione}
        prezzo={s.basePrezzo}
        dettagli={s.baseDettagli}
        t={t}
        media={
          s.baseImagePath ? (
            <Figura
              item={{ img: { id: 'base', path: s.baseImagePath }, render: false }}
              aspect={imgAspect(t)}
              hfd={IMG_HFD}
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
        t={t}
        media={rivImages.length > 0 ? <Galleria images={rivImages} t={t} /> : null}
      />

      {/* ---- Riepilogo prezzi ------------------------------------------------- */}
      <section
        className="break-inside-avoid"
        style={{ marginTop: lerp(30, 56, t) }}
        data-fr={26}
      >
        <KickerRule titolo="Riepilogo" />
        <div
          className="divide-y divide-line/70"
          style={{ marginTop: lerp(12, 20, t) }}
          data-fr={8}
        >
          <RigaPrezzo label={baseTitolo} value={s.basePrezzo} t={t} />
          <RigaPrezzo label={s.rivTitolo || 'Rivestimento'} value={s.rivPrezzo} t={t} />
        </div>
        {s.mostraTotale && (
          <div
            className="flex items-end justify-between gap-6 border-t-[1.5px] border-ink/40"
            style={{ marginTop: lerp(16, 24, t), paddingTop: lerp(16, 24, t) }}
            data-fr={8 + 8}
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
  t,
}: {
  titolo: string;
  nome?: string;
  descrizione: string;
  prezzo: number;
  dettagli: string;
  media: React.ReactNode;
  t: number;
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
      <div style={{ marginTop: lerp(16, 24, t) }} data-fr={8}>
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
    <section
      className="break-inside-avoid"
      style={{ marginBottom: lerp(30, 56, t) }}
      data-fr={26}
    >
      <KickerRule titolo={titolo} />
      {/* Senza media il testo occupa tutta la larghezza: mai colonne vuote. */}
      {media ? (
        <div
          className="grid grid-cols-[1fr_1.05fr] items-start gap-10"
          style={{ marginTop: lerp(16, 24, t) }}
          data-fr={8}
        >
          {testo}
          <div>{media}</div>
        </div>
      ) : (
        <div style={{ marginTop: lerp(16, 24, t) }} data-fr={8}>
          {testo}
        </div>
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
  t,
}: {
  images: { img: SchedaImage; render: boolean }[];
  t: number;
}) {
  const [hero, ...rest] = images;
  // Coppie per la griglia; l'eventuale spaiata finale chiude a tutta larghezza.
  const paired = rest.length % 2 === 0 ? rest : rest.slice(0, -1);
  const wide = rest.length % 2 === 0 ? null : rest[rest.length - 1];
  return (
    <div className="space-y-3">
      <Figura item={hero} aspect={imgAspect(t)} hfd={IMG_HFD} />
      {paired.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {paired.map((it) => (
            <Figura key={it.img.id} item={it} aspect={imgAspect(t)} hfd={IMG_HFD} />
          ))}
        </div>
      )}
      {wide && <Figura item={wide} aspect={wideAspect(t)} hfd={WIDE_HFD} />}
    </div>
  );
}

function Figura({
  item,
  aspect,
  hfd,
}: {
  item: { img: SchedaImage; render: boolean };
  aspect: number;
  hfd: number;
}) {
  const { url, status } = useStorageImageState(item.img.path);
  // Errore/immagine assente → colonna collassata (mai un box grigio). In
  // caricamento lo spazio è già riservato con lo stesso aspect: l'altezza del
  // documento è stabile fin dal primo layout, così il fit di stampa la misura
  // correttamente senza attendere il bitmap.
  if (status === 'error') return null;
  return (
    <figure className="break-inside-avoid">
      <div
        className="w-full overflow-hidden rounded-[10px] bg-stone-100"
        style={{ aspectRatio: aspect }}
        data-fw={hfd}
      >
        {url && <img src={url} className="h-full w-full object-cover" alt="" />}
      </div>
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
function RigaPrezzo({ label, value, t }: { label: string; value: number; t: number }) {
  return (
    <div
      className="flex items-baseline justify-between gap-6"
      style={{ paddingTop: lerp(6, 10, t), paddingBottom: lerp(6, 10, t) }}
      data-fr={8}
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
