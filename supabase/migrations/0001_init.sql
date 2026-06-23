-- ============================================================================
-- Preventivi Linea Eco — schema iniziale (multiutente, archivio condiviso)
--
-- Modello ibrido: colonne reali per i campi cercabili/filtrabili dell'archivio,
-- JSONB per il corpo completo del preventivo (l'oggetto `Quote` del dominio,
-- consumato 1:1 dall'engine di pricing — nessun cambiamento alla business logic).
--
-- Esegui con: supabase db push   (oppure incolla nello SQL editor di Supabase)
-- ============================================================================

-- ---- Enums ----------------------------------------------------------------
create type user_role as enum ('admin', 'operatore');
create type quote_stato as enum ('bozza', 'definitivo', 'inviato', 'archiviato');

-- ---- profiles (estende auth.users) ----------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role        user_role not null default 'operatore',
  created_at  timestamptz not null default now()
);

-- Crea automaticamente un profilo alla registrazione di un nuovo utente auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: true se l'utente corrente è admin (usato nelle policy).
create or replace function public.is_admin()
returns boolean
language sql
stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---- Numerazione preventivi: PRV-<anno>-<progressivo> ----------------------
create table public.quote_counters (
  anno     int primary key,
  last_seq int not null default 0
);

create or replace function public.next_quote_code()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  seq int;
begin
  insert into public.quote_counters (anno, last_seq)
  values (y, 1)
  on conflict (anno) do update set last_seq = quote_counters.last_seq + 1
  returning last_seq into seq;
  return 'PRV-' || y || '-' || lpad(seq::text, 4, '0');
end;
$$;

-- ---- quotes (record indicizzato + puntatore alla versione corrente) --------
create table public.quotes (
  id                 uuid primary key default gen_random_uuid(),
  codice             text unique not null default public.next_quote_code(),
  cliente            text not null default '',
  riferimento        text not null default '',
  focolare           text not null default '',
  stato              quote_stato not null default 'bozza',
  totale_finale      numeric(12,2) not null default 0,
  autore_id          uuid not null references public.profiles (id),
  current_version_id uuid,                -- FK aggiunta dopo (dipendenza circolare)
  has_pdf            boolean not null default false,
  -- soft lock advisory (gestione concorrenza minima)
  locked_by          uuid references public.profiles (id),
  locked_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index quotes_cliente_idx     on public.quotes (lower(cliente));
create index quotes_riferimento_idx on public.quotes (lower(riferimento));
create index quotes_stato_idx       on public.quotes (stato);
create index quotes_updated_idx     on public.quotes (updated_at desc);

-- ---- quote_versions (cronologia + corpo Quote completo in JSONB) -----------
create table public.quote_versions (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes (id) on delete cascade,
  version_no  int not null,
  label       text not null default '',
  data        jsonb not null,        -- oggetto Quote del dominio
  totali      jsonb not null,        -- snapshot QuoteTotals (per archivio/PDF)
  autore_id   uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  unique (quote_id, version_no)
);

create index quote_versions_quote_idx on public.quote_versions (quote_id, version_no desc);

alter table public.quotes
  add constraint quotes_current_version_fk
  foreign key (current_version_id) references public.quote_versions (id);

-- ---- quote_exports (PDF salvati nello storage) -----------------------------
create table public.quote_exports (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quotes (id) on delete cascade,
  version_id   uuid references public.quote_versions (id) on delete set null,
  storage_path text not null,        -- path nel bucket 'quote-pdfs'
  modalita     text not null default 'cliente',   -- 'cliente' | 'interna'
  autore_id    uuid not null references public.profiles (id),
  created_at   timestamptz not null default now()
);

create index quote_exports_quote_idx on public.quote_exports (quote_id, created_at desc);

-- ---- updated_at automatico -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quotes_touch_updated
  before update on public.quotes
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Archivio condiviso: tutti gli autenticati leggono e creano/modificano.
-- DELETE definitivo: solo admin (gli operatori usano lo stato 'archiviato').
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.quotes          enable row level security;
alter table public.quote_versions  enable row level security;
alter table public.quote_exports   enable row level security;

-- profiles: ognuno legge tutti i profili (per mostrare autori), modifica solo il proprio;
-- l'admin può modificare i ruoli.
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- quotes
create policy "quotes_select" on public.quotes
  for select using (auth.role() = 'authenticated');
create policy "quotes_insert" on public.quotes
  for insert with check (auth.uid() = autore_id);
create policy "quotes_update" on public.quotes
  for update using (auth.role() = 'authenticated');
create policy "quotes_delete_admin" on public.quotes
  for delete using (public.is_admin());

-- quote_versions
create policy "versions_select" on public.quote_versions
  for select using (auth.role() = 'authenticated');
create policy "versions_insert" on public.quote_versions
  for insert with check (auth.uid() = autore_id);
create policy "versions_delete_admin" on public.quote_versions
  for delete using (public.is_admin());

-- quote_exports
create policy "exports_select" on public.quote_exports
  for select using (auth.role() = 'authenticated');
create policy "exports_insert" on public.quote_exports
  for insert with check (auth.uid() = autore_id);
create policy "exports_delete_admin" on public.quote_exports
  for delete using (public.is_admin());

-- ============================================================================
-- STORAGE — bucket privato per i PDF
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('quote-pdfs', 'quote-pdfs', false)
on conflict (id) do nothing;

create policy "pdfs_read" on storage.objects
  for select using (bucket_id = 'quote-pdfs' and auth.role() = 'authenticated');
create policy "pdfs_insert" on storage.objects
  for insert with check (bucket_id = 'quote-pdfs' and auth.role() = 'authenticated');
create policy "pdfs_delete_admin" on storage.objects
  for delete using (bucket_id = 'quote-pdfs' and public.is_admin());
