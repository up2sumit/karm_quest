-- Phase 6: Notes table + Search/Tags + Realtime + Server-side XP/Streak (RPC) + Activity log
-- Run this once in Supabase SQL Editor (safe to re-run).

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Helpers (updated_at trigger)
-- You likely already have this from schema.sql; keeping it here is harmless.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) NOTES (normalized table; per-user; tags + full text search)
create table if not exists public.notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id text not null,
  title text not null default '',
  content text not null default '',
  tags text[] not null default '{}',
  color text not null default '#6366F1',
  emoji text not null default '📜',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- full-text search vector
  search tsvector generated always as (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
  ) stored,
  primary key (user_id, note_id)
);

drop trigger if exists trg_notes_updated_at on public.notes;
create trigger trg_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create index if not exists notes_user_updated_idx
on public.notes (user_id, updated_at desc);

create index if not exists notes_tags_gin
on public.notes using gin (tags);

create index if not exists notes_search_gin
on public.notes using gin (search);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
create policy "notes_select_own"
on public.notes
for select
using (auth.uid() = user_id);

drop policy if exists "notes_insert_own" on public.notes;
create policy "notes_insert_own"
on public.notes
for insert
with check (auth.uid() = user_id);

drop policy if exists "notes_update_own" on public.notes;
create policy "notes_update_own"
on public.notes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "notes_delete_own" on public.notes;
create policy "notes_delete_own"
on public.notes
for delete
using (auth.uid() = user_id);

-- RPC for search (query + tag filter)
create or replace function public.search_notes(
  q text default '',
  tags_filter text[] default null,
  limit_n int default 100
)
returns setof public.notes
language sql
stable
as $$
  select *
  from public.notes
  where user_id = auth.uid()
    and (
      q is null
      or q = ''
      or search @@ plainto_tsquery('english', q)
    )
    and (
      tags_filter is null
      or cardinality(tags_filter) = 0
      or tags && tags_filter
    )
  order by updated_at desc
  limit limit_n;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) ACTIVITY LOG (for timeline + realtime)
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_user_created_idx
on public.activity_log (user_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_select_own" on public.activity_log;
create policy "activity_select_own"
on public.activity_log
for select
using (auth.uid() = user_id);

drop policy if exists "activity_insert_own" on public.activity_log;
create policy "activity_insert_own"
on public.activity_log
for insert
with check (auth.uid() = user_id);

drop policy if exists "activity_delete_own" on public.activity_log;
create policy "activity_delete_own"
on public.activity_log
for delete
using (auth.uid() = user_id);

-- small helper rpc: log_activity (server sets user_id)
create or replace function public.log_activity(
  event_type text,
  payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.activity_log(user_id, event_type, payload)
  values (v_user, event_type, coalesce(payload, '{}'::jsonb));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) USER STATS (server-side truth for XP/level/streak)
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp int not null default 0,
  xp_to_next int not null default 100,
  level int not null default 1,
  total_xp_earned int not null default 0,
  coins int not null default 0,
  quests_completed int not null default 0,
  streak int not null default 0,
  streak_record int not null default 0,
  last_active_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_stats_updated_at on public.user_stats;
create trigger trg_user_stats_updated_at
before update on public.user_stats
for each row execute function public.set_updated_at();

create index if not exists user_stats_updated_idx
on public.user_stats (updated_at desc);

alter table public.user_stats enable row level security;

drop policy if exists "user_stats_select_own" on public.user_stats;
create policy "user_stats_select_own"
on public.user_stats
for select
using (auth.uid() = user_id);

drop policy if exists "user_stats_insert_own" on public.user_stats;
create policy "user_stats_insert_own"
on public.user_stats
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own" on public.user_stats;
create policy "user_stats_update_own"
on public.user_stats
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) TASKS: columns needed for secure completion
alter table public.tasks add column if not exists xp_reward int not null default 0;
alter table public.tasks add column if not exists completed_at date null;
alter table public.tasks add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create index if not exists tasks_user_updated_idx
on public.tasks (user_id, updated_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RPC: secure quest completion (updates tasks + user_stats atomically)
create or replace function public.complete_quest_secure(
  quest_id text
)
returns table (
  xp_earned int,
  coins_earned int,
  level int,
  xp int,
  xp_to_next int,
  total_xp_earned int,
  coins int,
  quests_completed int,
  streak int,
  streak_record int,
  last_active_date date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_xp_reward int;
  v_done boolean;
  v_xp_earned int;
  v_coins_earned int;

  s public.user_stats%rowtype;

  new_xp int;
  new_level int;
  new_xp_to_next int;
  new_total_xp int;
  new_coins int;
  new_quests_completed int;
  new_streak int;
  new_last_active date;
  new_streak_record int;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure stats row exists
  insert into public.user_stats(user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  -- Lock the stats row
  select * into s
  from public.user_stats
  where user_id = v_user
  for update;

  -- Read task row (must exist)
  select coalesce(t.xp_reward, 0), coalesce(t.done, false)
    into v_xp_reward, v_done
  from public.tasks t
  where t.user_id = v_user and t.quest_id = complete_quest_secure.quest_id
  limit 1;

  if not found then
    raise exception 'Task not found for this user / quest_id: %', complete_quest_secure.quest_id;
  end if;

  if v_done then
    -- already completed; return current stats with 0 earned
    xp_earned := 0;
    coins_earned := 0;
    level := s.level;
    xp := s.xp;
    xp_to_next := s.xp_to_next;
    total_xp_earned := s.total_xp_earned;
    coins := s.coins;
    quests_completed := s.quests_completed;
    streak := s.streak;
    streak_record := s.streak_record;
    last_active_date := s.last_active_date;
    return next;
    return;
  end if;

  v_xp_earned := v_xp_reward;
  v_coins_earned := v_xp_reward * 2;

  -- streak calc (date-based)
  new_streak := s.streak;
  new_last_active := s.last_active_date;

  if s.last_active_date is distinct from v_today then
    if s.last_active_date = (v_today - 1) then
      new_streak := s.streak + 1;
    else
      new_streak := 1;
    end if;
    new_last_active := v_today;
  end if;

  new_streak_record := greatest(coalesce(s.streak_record, 0), new_streak);

  -- xp / level calc
  new_xp := s.xp + v_xp_earned;
  new_level := s.level;
  new_xp_to_next := s.xp_to_next;

  if new_xp_to_next <= 0 then new_xp_to_next := 100; end if;
  if new_level <= 0 then new_level := 1; end if;

  while new_xp >= new_xp_to_next loop
    new_xp := new_xp - new_xp_to_next;
    new_level := new_level + 1;
    new_xp_to_next := round(new_xp_to_next * 1.2);
  end loop;

  new_total_xp := s.total_xp_earned + v_xp_earned;
  new_coins := s.coins + v_coins_earned;
  new_quests_completed := s.quests_completed + 1;

  update public.user_stats
  set
    xp = new_xp,
    xp_to_next = new_xp_to_next,
    level = new_level,
    total_xp_earned = new_total_xp,
    coins = new_coins,
    quests_completed = new_quests_completed,
    streak = new_streak,
    streak_record = new_streak_record,
    last_active_date = new_last_active
  where user_id = v_user;

  update public.tasks
  set
    done = true,
    completed_at = v_today
  where user_id = v_user and quest_id = complete_quest_secure.quest_id;

  -- activity
  insert into public.activity_log(user_id, event_type, payload)
  values (
    v_user,
    'quest_completed',
    jsonb_build_object(
      'quest_id', complete_quest_secure.quest_id,
      'xp', v_xp_earned,
      'coins', v_coins_earned,
      'date', v_today
    )
  );

  -- Return updated stats
  xp_earned := v_xp_earned;
  coins_earned := v_coins_earned;

  select us.level, us.xp, us.xp_to_next, us.total_xp_earned, us.coins, us.quests_completed, us.streak, us.streak_record, us.last_active_date
    into level, xp, xp_to_next, total_xp_earned, coins, quests_completed, streak, streak_record, last_active_date
  from public.user_stats us
  where us.user_id = v_user;

  return next;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Update the "new user" trigger (Phase 1) to also seed user_stats
-- If you already created handle_new_user() in Phase 1, this "create or replace" just adds stats seeding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, username, avatar_emoji, theme_mode)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'Yoddha'),
    '🧘',
    null
  )
  on conflict (user_id) do nothing;

  insert into public.user_state (user_id, app_key, version, snapshot)
  values (new.id, 'karmquest', '1.0.0', '{}'::jsonb)
  on conflict (user_id, app_key) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Realtime publication (optional but recommended).
-- In Supabase, Realtime uses the publication "supabase_realtime".
do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.notes;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.activity_log;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.user_stats;
  exception when duplicate_object then
    null;
  end;
end $$;
