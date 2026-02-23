-- supabase/schema.sql
-- Run this in Supabase SQL editor (once). It sets up:
--  1) profiles table (username + avatar + optional theme)
--  2) user_state table (entire app snapshot per user)
--  3) RLS policies so each user only sees their own rows

-- 1) profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Yoddha',
  avatar_emoji text not null default '🧘',
  theme_mode text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 2) user_state (JSON snapshot)
create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_key text not null,
  version text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app_key)
);

drop trigger if exists trg_user_state_updated_at on public.user_state;
create trigger trg_user_state_updated_at
before update on public.user_state
for each row execute function public.set_updated_at();

-- 3) RLS
alter table public.profiles enable row level security;
alter table public.user_state enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id);

-- User state policies
drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own" on public.user_state
for select using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own" on public.user_state
for insert with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own" on public.user_state
for update using (auth.uid() = user_id);

-- Optional: enforce allowed theme values
-- alter table public.profiles add constraint theme_mode_check
-- check (theme_mode in ('light','dark','hinglish') or theme_mode is null);
