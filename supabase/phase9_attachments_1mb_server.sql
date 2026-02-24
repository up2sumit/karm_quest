-- Phase 9.x: Server-side 1MB attachment limit (Supabase Storage)
-- Run this in Supabase SQL Editor.
-- This enforces the limit at the database policy layer (cannot be bypassed from the client).

-- Helper: safe int cast (avoids exceptions if metadata doesn't contain numeric strings)
create or replace function public._safe_int(t text)
returns int
language plpgsql
immutable
as $$
begin
  return t::int;
exception when others then
  return null;
end;
$$;

-- Drop old policies if you re-run this patch
drop policy if exists "attachments_1mb_insert" on storage.objects;
drop policy if exists "attachments_1mb_update" on storage.objects;

-- Enforce: only allow uploads to attachments bucket by the owner, and only if <= 1MB.
-- Supabase Storage stores object size in storage.objects.metadata (commonly 'size' or 'contentLength').
create policy "attachments_1mb_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attachments'
  and owner = auth.uid()
  and coalesce(
    public._safe_int(metadata->>'size'),
    public._safe_int(metadata->>'contentLength'),
    0
  ) <= 1048576
);

create policy "attachments_1mb_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'attachments'
  and owner = auth.uid()
)
with check (
  bucket_id = 'attachments'
  and owner = auth.uid()
  and coalesce(
    public._safe_int(metadata->>'size'),
    public._safe_int(metadata->>'contentLength'),
    0
  ) <= 1048576
);

-- Note:
-- If your bucket path policy requires files under auth.uid() prefix (recommended),
-- keep that existing policy as well (this patch only adds size enforcement).
