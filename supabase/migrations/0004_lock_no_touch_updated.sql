-- ============================================================================
-- 0004 — Il soft-lock non deve aggiornare updated_at.
--
-- Problema: acquisire/rinnovare/rilasciare il lock advisory fa un UPDATE su
-- public.quotes; il trigger touch_updated_at bumpava updated_at ad OGNI update,
-- lock inclusi. Così, appena aperto un preventivo, il lock cambiava updated_at
-- e il primo autosave andava in CONFLITTO (expectedUpdatedAt non più valido) →
-- il banner "Ricarica" faceva perdere le modifiche (i "reset" segnalati).
--
-- Fix: updated_at si aggiorna solo se cambia il CONTENUTO (colonne indicizzate,
-- stato, versione corrente, has_pdf), non se cambiano solo i campi del lock.
--
-- Esegui dopo 0001-0003. Incolla nello SQL editor di Supabase.
-- ============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  -- Update di solo-lock (locked_by / locked_at): lascia updated_at invariato.
  if new.cliente            is not distinct from old.cliente
     and new.riferimento    is not distinct from old.riferimento
     and new.focolare       is not distinct from old.focolare
     and new.stato          is not distinct from old.stato
     and new.totale_finale  is not distinct from old.totale_finale
     and new.current_version_id is not distinct from old.current_version_id
     and new.has_pdf        is not distinct from old.has_pdf then
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
