-- Phase 4: Mood Log (per-user) + RLS
-- Stores daily mood check-ins (1..5) with a lightweight productivity signal.
-- Safe to run multiple times.

create table if not exists public.mood_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  mood smallint not null check (mood between 1 and 5),
  productivity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.mood_log enable row level security;

-- Updated-at helper (idempotent)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mood_log_updated_at on public.mood_log;
create trigger trg_mood_log_updated_at
before update on public.mood_log
for each row
execute function public.set_updated_at();

-- RLS policies (drop+recreate safe)
drop policy if exists "mood_log_select_own" on public.mood_log;
drop policy if exists "mood_log_insert_own" on public.mood_log;
drop policy if exists "mood_log_update_own" on public.mood_log;
drop policy if exists "mood_log_delete_own" on public.mood_log;

create policy "mood_log_select_own"
on public.mood_log
for select
using (auth.uid() = user_id);

create policy "mood_log_insert_own"
on public.mood_log
for insert
with check (auth.uid() = user_id);

create policy "mood_log_update_own"
on public.mood_log
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "mood_log_delete_own"
on public.mood_log
for delete
using (auth.uid() = user_id);

-- Helpful index for dashboard queries
create index if not exists idx_mood_log_user_day_desc on public.mood_log (user_id, day desc);
