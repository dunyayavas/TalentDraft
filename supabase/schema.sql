-- TalentDraft Supabase schema (MVP)
-- Run this in your Supabase SQL editor

create extension if not exists pgcrypto;

-- Projects (companies / tenants)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  admin_email text not null,
  admin_password text not null,
  created_at timestamptz not null default now()
);

-- Sessions (games) belong to a project
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  name text not null,
  company text,
  pick_mode text not null check (pick_mode in ('percentage','fixed')),
  pick_value integer not null,
  created_at timestamptz not null default now()
);

-- Talents
create table if not exists public.talents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  function text,
  department text,
  level text,
  grade text,
  time_in_company text,
  time_in_job text,
  performance text,
  potential text,
  extra jsonb
);
create index if not exists talents_session_id_idx on public.talents(session_id);

-- Players
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  token text not null unique
);
create index if not exists players_session_id_idx on public.players(session_id);
create index if not exists players_token_idx on public.players(token);

-- Picks
create table if not exists public.picks (
  id bigserial primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  "order" integer not null,
  talent_id uuid not null references public.talents(id) on delete cascade,
  rationale text
);
create unique index if not exists picks_unique_per_slot on public.picks(session_id, player_id, "order");
create index if not exists picks_player_idx on public.picks(player_id);

-- MVP: disable RLS for simplicity (no auth). Consider proper RLS later.
alter table public.sessions disable row level security;
alter table public.talents disable row level security;
alter table public.players disable row level security;
alter table public.picks disable row level security;
