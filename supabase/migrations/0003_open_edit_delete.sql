-- ============================================================================
-- 0003 — Modifica ed eliminazione aperte a tutti gli utenti autenticati.
--
-- Cambio di policy (decisione 2026-06-23): l'eliminazione definitiva NON è più
-- riservata all'admin. Ogni utente autenticato può modificare ed eliminare
-- qualunque preventivo dell'archivio condiviso.
--
-- Include anche la policy UPDATE mancante su quote_versions, indispensabile
-- per l'autosave in-place (che fa UPDATE sulla versione corrente): senza di
-- essa, con RLS attivo, il salvataggio automatico verrebbe rifiutato.
--
-- Esegui dopo 0001/0002. Incolla nello SQL editor di Supabase oppure: supabase db push
-- ============================================================================

-- ---- quotes: DELETE per tutti gli autenticati ------------------------------
drop policy if exists "quotes_delete_admin" on public.quotes;
create policy "quotes_delete" on public.quotes
  for delete using (auth.role() = 'authenticated');

-- ---- quote_versions: UPDATE (autosave) + DELETE per tutti gli autenticati ---
drop policy if exists "versions_delete_admin" on public.quote_versions;
create policy "versions_update" on public.quote_versions
  for update using (auth.role() = 'authenticated');
create policy "versions_delete" on public.quote_versions
  for delete using (auth.role() = 'authenticated');

-- ---- quote_exports: DELETE per tutti gli autenticati -----------------------
drop policy if exists "exports_delete_admin" on public.quote_exports;
create policy "exports_delete" on public.quote_exports
  for delete using (auth.role() = 'authenticated');

-- ---- storage (PDF): DELETE per tutti gli autenticati -----------------------
drop policy if exists "pdfs_delete_admin" on storage.objects;
create policy "pdfs_delete" on storage.objects
  for delete using (bucket_id = 'quote-pdfs' and auth.role() = 'authenticated');
