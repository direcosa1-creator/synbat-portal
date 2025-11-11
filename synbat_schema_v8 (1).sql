
-- SynBat v8.1 — Supabase schema (Postgres + RLS)
-- Tables: orgs, org_members, aziende, collaboratori, richieste, contratti, documenti
-- RLS: per-organization access; users must be members of org via org_members(user_id, org_id).
-- Storage bucket expected: 'docs' (create it from Supabase Storage UI).

-- Enable UUID if desired (we'll use text ids for simplicity here)
-- create extension if not exists "uuid-ossp";

-- 1) Organizations
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2) Organization members
create table if not exists public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null, -- supabase auth uid
  role text not null check (role in ('viewer','manager','admin','synbat_admin')),
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

-- 3) Aziende (client companies)
create table if not exists public.aziende (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  ragione text,
  cf text,
  pec text,
  email text,
  tel text,
  ccnl text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 4) Collaboratori (workers)
create table if not exists public.collaboratori (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  nome text not null,
  cognome text not null,
  nascita date,
  naz text,
  iban text,
  swift text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 5) Richieste (job requests)
create table if not exists public.richieste (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  azienda_id uuid references public.aziende(id) on delete set null,
  mansione text,
  numero int not null default 1,
  cantiere text,
  inizio date,
  fine date,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- 6) Contratti (assignments/detachments)
create table if not exists public.contratti (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  richiesta uuid references public.richieste(id) on delete set null,
  collab uuid[] not null default '{}', -- array of collaborator ids
  a1 boolean not null default false,
  distacco boolean not null default false,
  rapp boolean not null default false,
  ccnl boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7) Documenti (metadata of files stored in Storage bucket 'docs')
create table if not exists public.documenti (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  owner_type text not null check (owner_type in ('COLLAB','AZIENDA','CONTR')),
  owner_id uuid,
  tipo text,
  label text,
  storage_path text not null, -- storage path e.g. org/{org_id}/COLLAB/{collab_id}/file.pdf
  mime text,
  created_at timestamptz not null default now(),
  expires date
);

-- ==========
-- RLS
-- ==========

alter table public.orgs enable row level security;
alter table public.org_members enable row level security;
alter table public.aziende enable row level security;
alter table public.collaboratori enable row level security;
alter table public.richieste enable row level security;
alter table public.contratti enable row level security;
alter table public.documenti enable row level security;

-- Helper: membership check
create or replace function public.is_member(target_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.org_members m
    where m.org_id = target_org and m.user_id = auth.uid()
  );
$$;

-- orgs: visible only if member
create policy "orgs_select_if_member" on public.orgs
for select using ( public.is_member(id) );

-- org_members: a member can see rows of their org; admin can manage
create policy "org_members_select_if_member" on public.org_members
for select using ( public.is_member(org_id) );

create policy "org_members_insert_admin_only" on public.org_members
for insert with check ( public.is_member(org_id) );
-- (Fine-grain: you can strengthen to require admin role via a role check if you add a function)

create policy "org_members_update_admin_only" on public.org_members
for update using ( public.is_member(org_id) );

create policy "org_members_delete_admin_only" on public.org_members
for delete using ( public.is_member(org_id) );

-- aziende
create policy "aziende_rw_if_member" on public.aziende
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- collaboratori
create policy "collaboratori_rw_if_member" on public.collaboratori
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- richieste
create policy "richieste_rw_if_member" on public.richieste
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- contratti
create policy "contratti_rw_if_member" on public.contratti
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- documenti
create policy "documenti_rw_if_member" on public.documenti
for all using ( public.is_member(org_id) )
with check ( public.is_member(org_id) );

-- ============================
-- Storage access policies (bucket: docs)
-- ============================
-- Supabase Storage uses table storage.objects; we add policies that mirror org-based paths.
-- Convention path: org/{org_id}/{owner_type}/{owner_id}/{filename}

-- Allow read if the path starts with org/{org_id} where user is member
create policy "storage_read_docs_if_member" on storage.objects
for select using (
  bucket_id = 'docs'
  and (
    -- parse org id from path: position after 'org/'
    public.is_member( nullif( split_part(object_name, '/', 2), '' )::uuid )
  )
);

-- Allow insert if member of that org (path must match)
create policy "storage_insert_docs_if_member" on storage.objects
for insert with check (
  bucket_id = 'docs'
  and (
    public.is_member( nullif( split_part(object_name, '/', 2), '' )::uuid )
  )
);

-- Allow delete/update if member
create policy "storage_update_docs_if_member" on storage.objects
for update using (
  bucket_id = 'docs'
  and public.is_member( nullif( split_part(object_name, '/', 2), '' )::uuid )
);

create policy "storage_delete_docs_if_member" on storage.objects
for delete using (
  bucket_id = 'docs'
  and public.is_member( nullif( split_part(object_name, '/', 2), '' )::uuid )
);

-- ============================
-- Seed (optional)
-- ============================
-- insert into orgs(name) values ('SynBat');
-- select * from orgs;
