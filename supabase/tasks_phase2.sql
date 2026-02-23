-- Phase 2: Sync KarmQuest Quests -> tasks table
-- Run this once in Supabase SQL Editor.

-- 1) Add quest_id so each quest maps to one row.
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS quest_id text;

-- 2) Ensure tasks.id has a default (optional, but good).
-- If you already have a default, this is harmless.
ALTER TABLE public.tasks
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3) Unique constraint so we can UPSERT (update if exists).
-- One quest per user.
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_quest_unique
ON public.tasks (user_id, quest_id);

-- 4) Row Level Security policies (own rows only).
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own"
ON public.tasks
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own"
ON public.tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own"
ON public.tasks
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own"
ON public.tasks
FOR DELETE
USING (auth.uid() = user_id);
