-- Phase 5: Activity Timeline / Audit Log
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  entity_type text null,
  entity_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

-- Read own rows
drop policy if exists "activity_log_select_own" on public.activity_log;
create policy "activity_log_select_own" on public.activity_log
for select using (user_id = auth.uid());

-- Insert own rows
drop policy if exists "activity_log_insert_own" on public.activity_log;
create policy "activity_log_insert_own" on public.activity_log
for insert with check (user_id = auth.uid());

-- Delete own rows (optional for 'Clear')
drop policy if exists "activity_log_delete_own" on public.activity_log;
create policy "activity_log_delete_own" on public.activity_log
for delete using (user_id = auth.uid());

create index if not exists activity_log_user_created_idx
on public.activity_log (user_id, created_at desc);

-- RPC helper: keeps user_id server-side via auth.uid().
-- Client can call: supabase.rpc('log_activity', { event_type, entity_type, entity_id, payload })
create or replace function public.log_activity(
  event_type text,
  entity_type text default null,
  entity_id text default null,
  payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.activity_log(user_id, event_type, entity_type, entity_id, payload)
  values (auth.uid(), event_type, entity_type, entity_id, coalesce(payload, '{}'::jsonb));
end;
$$;

grant execute on function public.log_activity(text, text, text, jsonb) to authenticated;
