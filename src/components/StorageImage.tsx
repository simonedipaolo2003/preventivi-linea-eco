// ============================================================================
// StorageImage — risolve un path del bucket in un object URL locale e lo
// mostra come <img>. Gli object URL (blob:) sono same-origin: html2canvas li
// cattura nel PDF senza problemi CORS. Finché l'immagine non è pronta (o se
// il download fallisce) non rende nulla: il layout chiamante gestisce il
// fallback collassando la colonna, mai buchi grigi nel documento.
// ============================================================================
import { useEffect, useState } from 'react';
import { imagesRepo } from '@/data/repositories';

/** Object URL per un path di storage; null finché non risolto o su errore. */
export function useStorageImage(path: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let active = true;
    let created: string | null = null;
    imagesRepo
      .objectUrl(path)
      .then((u) => {
        if (active) {
          created = u;
          setUrl(u);
        } else {
          URL.revokeObjectURL(u);
        }
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
      setUrl(null);
    };
  }, [path]);

  return url;
}

export function StorageImg({
  path,
  className,
  alt = '',
}: {
  path: string | undefined;
  className?: string;
  alt?: string;
}) {
  const url = useStorageImage(path);
  if (!url) return null;
  return <img src={url} className={className} alt={alt} />;
}
