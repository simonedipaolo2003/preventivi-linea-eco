// ============================================================================
// Identità "solo username" — l'utente digita esclusivamente il proprio nome.
// Supabase richiede comunque email+password: le deriviamo qui in modo
// deterministico dallo username, con una password condivisa fissa.
//
// NB: è un tool INTERNO (4 PC, URL non pubblicizzato). La password condivisa
// vive nel bundle: chiunque conosca uno username e l'URL può entrare. È un
// compromesso accettato di proposito per la massima semplicità d'accesso.
// ============================================================================

/** Dominio fittizio per le email sintetiche (non deve ricevere posta). */
const EMAIL_DOMAIN = 'preventivi-eco.local';

/** Password condivisa fissa usata dietro le quinte per tutti gli accessi. */
export const SHARED_PASSWORD = 'linea-eco-2026!';

/** Normalizza lo username in uno slug stabile (minuscolo, trattini). */
export function usernameSlug(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Email sintetica e deterministica a partire dallo username. */
export function emailForUsername(username: string): string {
  return `${usernameSlug(username)}@${EMAIL_DOMAIN}`;
}
