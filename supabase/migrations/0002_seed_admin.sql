-- ============================================================================
-- BOOTSTRAP PRIMO ADMIN
--
-- Gli utenti si creano dalla dashboard Supabase (Authentication → Add user)
-- oppure dalla pagina di login dell'app (signUp). Il trigger handle_new_user
-- crea automaticamente un profilo con ruolo 'operatore'.
--
-- Per promuovere il PRIMO utente ad admin, esegui questo dopo averlo creato,
-- sostituendo l'email:
-- ============================================================================

update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@example.com');
