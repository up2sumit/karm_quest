-- Phase 7: Reminders + In-app Notifications + Cron Processor
-- Run this ONCE in Supabase SQL Editor.
-- What you get:
--  - public.reminders: per-user scheduled reminders (quests or notes)
--  - public.in_app_notifications: an inbox used by the app UI (includes reminders)
--  - public.process_due_reminders(): DB function that converts due reminders -> notifications
--  - A cron job (every minute) that runs process_due_reminders()
--
-- Prereq (Supabase): Enable the Cron module / pg_cron extension
-- Dashboard: Integrations -> Cron -> Enable
-- Docs: https://supabase.com/docs/guides/cron

-- 0) Extensions
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- Ensure the common updated_at trigger function exists
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1) Reminders table
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('task','note')),
  -- For tasks we store Quest id (string). For notes we store Note id (string).
  entity_id text not null,
  -- Optional: store the title at the time reminder was created (nice for notifications)
  title text null,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','sent','cancelled')),
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_user_status_time_idx
on public.reminders (user_id, status, remind_at);

drop trigger if exists trg_reminders_updated_at on public.reminders;
create trigger trg_reminders_updated_at
before update on public.reminders
for each row execute function public.set_updated_at();

-- 2) In-app notifications table (used by your existing Notifications UI)
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'reminder',
  title text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists in_app_notifications_user_created_idx
on public.in_app_notifications (user_id, created_at desc);

drop trigger if exists trg_in_app_notifications_updated_at on public.in_app_notifications;
create trigger trg_in_app_notifications_updated_at
before update on public.in_app_notifications
for each row execute function public.set_updated_at();

-- 3) RLS (each user sees only their rows)
alter table public.reminders enable row level security;
alter table public.in_app_notifications enable row level security;

-- Reminders policies
drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders
for select using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders
for insert with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders
for delete using (auth.uid() = user_id);

-- Notifications policies
drop policy if exists "in_app_notifications_select_own" on public.in_app_notifications;
create policy "in_app_notifications_select_own" on public.in_app_notifications
for select using (auth.uid() = user_id);

-- We do NOT want the client to create notifications directly.
-- They are created by the DB cron processor (security definer).
-- So: no INSERT policy.

drop policy if exists "in_app_notifications_update_own" on public.in_app_notifications;
create policy "in_app_notifications_update_own" on public.in_app_notifications
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "in_app_notifications_delete_own" on public.in_app_notifications;
create policy "in_app_notifications_delete_own" on public.in_app_notifications
for delete using (auth.uid() = user_id);

-- 4) Reminder processor (DB-side)
-- - Picks pending reminders whose remind_at <= now()
-- - Inserts a notification row
-- - Marks reminder as sent
create or replace function public.process_due_reminders(max_rows int default 200)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int;
begin
  with due as (
    select r.id, r.user_id, r.entity_type, r.entity_id, r.title, r.remind_at
    from public.reminders r
    where r.status = 'pending'
      and r.remind_at <= now()
    order by r.remind_at asc
    limit max_rows
    for update skip locked
  ), ins as (
    insert into public.in_app_notifications (user_id, type, title, message, payload)
    select
      d.user_id,
      'reminder',
      coalesce(nullif(d.title, ''), 'Reminder ⏰'),
      case when d.entity_type = 'task'
        then 'Your quest is due. Time to act, Yoddha!'
        else 'Quick check: you set a note reminder.'
      end,
      jsonb_build_object(
        'entity_type', d.entity_type,
        'entity_id', d.entity_id,
        'remind_at', d.remind_at
      )
    from due d
  )
  update public.reminders r
    set status = 'sent',
        sent_at = now(),
        updated_at = now()
  where r.id in (select id from due);

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- 5) Cron job (every minute)
-- Note: Job names are case sensitive. Creating again with same name overwrites.
select cron.schedule(
  'karmquest-process-reminders',
  '* * * * *',
  $$ select public.process_due_reminders(200); $$
);

-- 6) Optional: enable realtime feed for notifications so the app can subscribe.
-- If the publication does not exist in your project, ignore this part.
do $$
begin
  alter publication supabase_realtime add table public.in_app_notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
