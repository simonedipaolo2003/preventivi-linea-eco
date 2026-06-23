// ============================================================================
// Client Supabase — singola istanza condivisa.
// Le chiavi arrivano da .env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True se l'app è configurata per il backend condiviso. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Client unico. Se le env non sono impostate resta null: la UI mostra un
 * messaggio di configurazione invece di crashare.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Accesso sicuro: lancia se usato senza configurazione (errore esplicito). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env',
    );
  }
  return supabase;
}
