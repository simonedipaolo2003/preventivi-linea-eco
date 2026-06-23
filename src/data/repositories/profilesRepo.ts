// ============================================================================
// profilesRepo — accesso ai profili utente (estensione di auth.users).
// Le feature consumano sempre il repo, mai il client Supabase direttamente.
// ============================================================================
import { requireSupabase } from '@/data/supabase/client';
import type { ProfileRow } from '@/data/supabase/types';

/** Profilo dell'utente attualmente autenticato (o null se non loggato). */
export async function me(): Promise<ProfileRow | null> {
  const sb = requireSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/** Elenco di tutti i profili (per mostrare gli autori nell'archivio). */
export async function list(): Promise<ProfileRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

/** Mappa id → display_name, comoda per arricchire le liste. */
export async function nameMap(): Promise<Map<string, string>> {
  const rows = await list();
  return new Map(rows.map((r) => [r.id, r.display_name || '—']));
}

/** Aggiorna il nome visualizzato del profilo corrente. */
export async function updateDisplayName(id: string, displayName: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', id);

  if (error) throw error;
}
