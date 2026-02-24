-- Phase 3: Backups (restore points)
-- Run this in Supabase SQL Editor

-- 1) Table
create extension if not exists pgcrypto;

create table if not exists public.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_key text not null,
  label text not null default '',
  snapshot jsonb not null,
  version text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists user_backups_user_id_created_at_idx
  on public.user_backups(user_id, created_at desc);

create index if not exists user_backups_user_id_app_key_idx
  on public.user_backups(user_id, app_key);

alter table public.user_backups enable row level security;

-- 2) RLS Policies
-- Users can read only their own backups
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_backups' and policyname='user_backups_select_own'
  ) then
    create policy user_backups_select_own on public.user_backups
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Users can create only their own backups
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_backups' and policyname='user_backups_insert_own'
  ) then
    create policy user_backups_insert_own on public.user_backups
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can delete only their own backups
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_backups' and policyname='user_backups_delete_own'
  ) then
    create policy user_backups_delete_own on public.user_backups
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- 3) RPC: Create backup from current user_state (server-side)
create or replace function public.create_user_backup(
  p_app_key text,
  p_label text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  s jsonb;
  v text;
  new_id uuid;
  final_label text;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select snapshot, version into s, v
  from public.user_state
  where user_id = uid and app_key = p_app_key;

  if s is null then
    raise exception 'no user_state found for app_key=%', p_app_key;
  end if;

  final_label := nullif(trim(coalesce(p_label, '')), '');
  if final_label is null then
    final_label := to_char(now(), 'YYYY-MM-DD HH24:MI');
  end if;

  insert into public.user_backups(user_id, app_key, label, snapshot, version)
  values (uid, p_app_key, final_label, s, coalesce(v, ''))
  returning id into new_id;

  return new_id;
end;
$$;

-- 4) RPC: Restore backup back into user_state (server-side)
create or replace function public.restore_user_backup(
  p_backup_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  b record;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select id, user_id, app_key, snapshot, version into b
  from public.user_backups
  where id = p_backup_id and user_id = uid;

  if not found then
    raise exception 'backup not found';
  end if;

  -- Upsert into user_state
  insert into public.user_state(user_id, app_key, version, snapshot)
  values (uid, b.app_key, coalesce(b.version, ''), b.snapshot)
  on conflict (user_id, app_key)
  do update set
    version = excluded.version,
    snapshot = excluded.snapshot,
    updated_at = now();
end;
$$;

-- 5) Optional: grant execute to anon/authenticated (Supabase typically handles this, but safe to be explicit)
grant execute on function public.create_user_backup(text, text) to anon, authenticated;
grant execute on function public.restore_user_backup(uuid) to anon, authenticated;
