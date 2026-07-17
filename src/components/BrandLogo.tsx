// ============================================================================
// BrandLogo — logo aziendale FISSO (MarsiCamin). Non è più un upload per
// preventivo: è il marchio dell'azienda.
//
// Usa il file reale in /brand/logo-marsicamin.png se presente (basta metterlo
// lì per averlo pixel-perfect nel PDF); finché non c'è, mostra un wordmark
// tipografico on-brand — così il layout funziona subito e resta esatto una
// volta caricato il file. È DOM (img o testo): html2canvas lo cattura senza
// problemi CORS.
// ============================================================================
import { useState } from 'react';

const LOGO_SRC = '/brand/logo-marsicamin.png';

export function BrandLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={LOGO_SRC}
        alt="MarsiCamin"
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback wordmark (rosso marchio, tondeggiante e in evidenza).
  return (
    <span
      className={`font-sans font-extrabold leading-none tracking-tight ${className ?? ''}`}
      style={{ color: '#E2001A', fontSize: '2rem' }}
    >
      MarsiCamin
    </span>
  );
}
