-- supabase/phase1.sql
-- Phase 1 backend hardening (recommended for "real project" behavior)
--
-- What this does:
--   A) Auto-create `profiles` + seed `user_state` when a new user signs up (DB-side trigger)
--   B) Ensure `tasks` has updated_at + helpful indexes (performance + clean audit trail)
--   C) Re-assert RLS policies for `tasks` (safe if already applied)
--
-- Run this ONCE in Supabase SQL Editor.

-- -------------------------
-- A) SIGNUP TRIGGER (DB seeds profile + user_state)
-- -------------------------

-- helper: updated_at trigger function (already exists in your schema.sql; safe to re-create)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create/replace signup handler
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
begin
  -- username from email (left side), max 16 chars
  uname := coalesce(nullif(split_part(new.email, '@', 1), ''), 'Yoddha');
  if length(uname) > 16 then
    uname := left(uname, 16);
  end if;

  -- profiles row
  insert into public.profiles (user_id, username, avatar_emoji, theme_mode)
  values (new.id, uname, '🧘', null)
  on conflict (user_id) do nothing;

  -- user_state seed (app_key must match your frontend; current app_key is "karmquest")
  insert into public.user_state (user_id, app_key, version, snapshot)
  values (new.id, 'karmquest', '1.3.0', '{}'::jsonb)
  on conflict (user_id, app_key) do nothing;

  return new;
end;
$$;

-- Recreate trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- OPTIONAL (recommended once): backfill for existing users who signed up before this trigger existed.
-- This will ONLY create missing rows; it will NOT overwrite existing data.
insert into public.profiles (user_id, username, avatar_emoji, theme_mode)
select u.id,
       left(coalesce(nullif(split_part(u.email, '@', 1), ''), 'Yoddha'), 16),
       '🧘',
       null
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null;

insert into public.user_state (user_id, app_key, version, snapshot)
select u.id, 'karmquest', '1.3.0', '{}'::jsonb
from auth.users u
left join public.user_state s on s.user_id = u.id and s.app_key = 'karmquest'
where s.user_id is null;

-- -------------------------
-- B) TASKS TABLE HARDENING (updated_at + indexes)
-- -------------------------

-- If tasks table doesn't exist, create it (safe if it already exists).
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text null,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure missing columns exist (safe no-ops if already present).
alter table public.tasks
  add column if not exists quest_id text;

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

-- Keep tasks.updated_at fresh
drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Helpful indexes for common queries (safe if already present).
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_user_done_idx on public.tasks (user_id, done);
create index if not exists tasks_user_created_at_idx on public.tasks (user_id, created_at desc);

-- -------------------------
-- C) TASKS RLS (own rows only)
-- -------------------------
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks
for select
using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks
for delete
using (auth.uid() = user_id);
