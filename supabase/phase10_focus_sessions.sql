-- ═══════════════════════════════════════════════════════════════════════════════
-- Phase 10: Focus Sessions — dedicated table for focus timer history
-- ═══════════════════════════════════════════════════════════════════════════════

-- Focus sessions table — one row per completed focus session
create table if not exists public.focus_sessions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  quest_id    text        not null,
  quest_title text        not null default '',
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  duration_ms integer     not null,
  label       text        not null default 'Pomodoro',
  xp_awarded  integer     not null default 0,
  day         date        not null,
  created_at  timestamptz not null default now()
);

-- Index for efficient per-user queries (newest first)
create index if not exists idx_focus_sessions_user_day
  on public.focus_sessions (user_id, day desc);

-- ── Row-Level Security ─────────────────────────────────────────────────────

alter table public.focus_sessions enable row level security;

-- Users can read their own focus sessions
create policy "Users read own focus sessions"
  on public.focus_sessions
  for select
  using (auth.uid() = user_id);

-- Users can insert their own focus sessions
create policy "Users insert own focus sessions"
  on public.focus_sessions
  for insert
  with check (auth.uid() = user_id);

-- Users can delete their own focus sessions (e.g. reset all data)
create policy "Users delete own focus sessions"
  on public.focus_sessions
  for delete
  using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Helper RPC: log_focus_session
-- Idempotent insert (uses quest_id + started_at as a natural dedup key).
-- ═══════════════════════════════════════════════════════════════════════════════

create or replace function public.log_focus_session(
  p_quest_id    text,
  p_quest_title text,
  p_started_at  timestamptz,
  p_ended_at    timestamptz,
  p_duration_ms integer,
  p_label       text,
  p_xp_awarded  integer,
  p_day         date
)
returns void
language plpgsql
security definer
as $$
begin
  -- Idempotent: skip if this exact session was already logged
  if exists (
    select 1 from public.focus_sessions
    where user_id = auth.uid()
      and quest_id = p_quest_id
      and started_at = p_started_at
  ) then
    return;
  end if;

  insert into public.focus_sessions (
    user_id, quest_id, quest_title,
    started_at, ended_at, duration_ms,
    label, xp_awarded, day
  ) values (
    auth.uid(), p_quest_id, p_quest_title,
    p_started_at, p_ended_at, p_duration_ms,
    p_label, p_xp_awarded, p_day
  );
end;
$$;
