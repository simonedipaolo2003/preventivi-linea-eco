// ============================================================================
// StorageImage — risolve un path del bucket in un object URL locale e lo
// mostra come <img>. Gli object URL (blob:) sono same-origin: html2canvas li
// cattura nel PDF senza problemi CORS. Lo stato distingue caricamento (spazio
// riservabile dal chiamante) da errore (colonna collassata, mai buchi grigi
// nel documento) — utile perché il fit di stampa possa misurare un'altezza
// stabile senza aspettare il bitmap.
// ============================================================================
import { useEffect, useState, type CSSProperties } from 'react';
import { imagesRepo } from '@/data/repositories';

export type ImageStatus = 'loading' | 'ready' | 'error';

/** Object URL + stato per un path di storage. */
export function useStorageImageState(path: string | undefined): {
  url: string | null;
  status: ImageStatus;
} {
  const [state, setState] = useState<{ url: string | null; status: ImageStatus }>({
    url: null,
    status: path ? 'loading' : 'error',
  });

  useEffect(() => {
    if (!path) {
      setState({ url: null, status: 'error' });
      return;
    }
    setState({ url: null, status: 'loading' });
    let active = true;
    let created: string | null = null;
    imagesRepo
      .objectUrl(path)
      .then((u) => {
        if (active) {
          created = u;
          setState({ url: u, status: 'ready' });
        } else {
          URL.revokeObjectURL(u);
        }
      })
      .catch(() => {
        if (active) setState({ url: null, status: 'error' });
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [path]);

  return state;
}

/** Object URL per un path di storage; null finché non risolto o su errore. */
export function useStorageImage(path: string | undefined): string | null {
  return useStorageImageState(path).url;
}

export function StorageImg({
  path,
  className,
  alt = '',
  style,
}: {
  path: string | undefined;
  className?: string;
  alt?: string;
  style?: CSSProperties;
}) {
  const url = useStorageImage(path);
  if (!url) return null;
  return <img src={url} className={className} alt={alt} style={style} />;
}
