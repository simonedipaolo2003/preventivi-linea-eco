// ============================================================================
// devPlaceholders — immagini placeholder generate in locale (canvas) per il
// harness /dev/scheda. Caricato SOLO in dev via dynamic import (vedi
// imagesRepo.objectUrl): in produzione il modulo non entra nel bundle.
// ============================================================================

/** Immagine placeholder "materica": gradiente pietra + venature pseudo-casuali. */
export function devPlaceholderUrl(seed: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  // Base: tinte pietra diverse per seed
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 997;
  const tones = [
    ['#8a8378', '#b5aea2'],
    ['#6e675c', '#a39a8b'],
    ['#4a453e', '#7d766a'],
    ['#9c948a', '#cfc8bc'],
  ];
  const [a, b] = tones[h % tones.length];
  const g = ctx.createLinearGradient(0, 0, 1200, 900);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 900);
  // Venature
  let x = (h * 13) % 1200;
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  for (let i = 0; i < 7; i++) {
    ctx.lineWidth = 1 + ((h + i) % 3);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 140, 300, x - 180, 620, x + 90, 900);
    ctx.stroke();
    x = (x + 210 + i * 37) % 1200;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.font = '28px Inter, sans-serif';
  ctx.fillText(seed, 36, 860);
  return canvas.toDataURL('image/jpeg', 0.85);
}
