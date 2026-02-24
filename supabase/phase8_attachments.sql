-- Phase 8: Attachments (Supabase Storage + metadata table)
-- Creates:
--  - storage bucket: attachments (private)
--  - public.attachments table to store metadata per user + entity
--  - RLS policies for both table + storage.objects

create extension if not exists pgcrypto;

-- 1) Storage bucket (private)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- 2) Metadata table
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('note', 'quest')),
  entity_id text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create unique index if not exists attachments_unique_path
  on public.attachments(user_id, entity_type, entity_id, storage_path);

create index if not exists attachments_user_entity_idx
  on public.attachments(user_id, entity_type, entity_id, created_at desc);

alter table public.attachments enable row level security;

-- RLS for metadata
do $$
begin
  -- select
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attachments' and policyname='attachments_select_own'
  ) then
    create policy attachments_select_own
      on public.attachments
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  -- insert
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attachments' and policyname='attachments_insert_own'
  ) then
    create policy attachments_insert_own
      on public.attachments
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  -- delete
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='attachments' and policyname='attachments_delete_own'
  ) then
    create policy attachments_delete_own
      on public.attachments
      for delete
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- 3) Storage policies: only allow a user to access objects inside their own folder:
-- name must start with "<auth.uid()>/"
do $$
begin
  -- SELECT (download / signed-url access)
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='attachments_objects_select_own'
  ) then
    create policy attachments_objects_select_own
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'attachments'
        and (name like (auth.uid()::text || '/%'))
      );
  end if;

  -- INSERT (upload new)
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='attachments_objects_insert_own'
  ) then
    create policy attachments_objects_insert_own
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'attachments'
        and (name like (auth.uid()::text || '/%'))
      );
  end if;

  -- UPDATE (upsert overwrite)
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='attachments_objects_update_own'
  ) then
    create policy attachments_objects_update_own
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'attachments'
        and (name like (auth.uid()::text || '/%'))
      )
      with check (
        bucket_id = 'attachments'
        and (name like (auth.uid()::text || '/%'))
      );
  end if;

  -- DELETE (remove)
  if not exists (
    select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='attachments_objects_delete_own'
  ) then
    create policy attachments_objects_delete_own
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'attachments'
        and (name like (auth.uid()::text || '/%'))
      );
  end if;
end $$;
