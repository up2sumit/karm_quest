import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type AttachmentRow = {
  id: string;
  user_id: string;
  entity_type: 'note' | 'quest';
  entity_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function safeFileName(name: string) {
  return name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function useSupabaseAttachments(entityType: 'note' | 'quest', entityId: string | null) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestEntityId = useRef<string | null>(entityId);
  latestEntityId.current = entityId;

  const canUse = useMemo(() => Boolean(userId && entityId), [userId, entityId]);

  const refresh = useCallback(async () => {
    if (!canUse || !userId || !entityId) {
      setRows([]);
      return;
    }
    setError(null);
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }
    setRows((data as AttachmentRow[]) || []);
  }, [canUse, userId, entityType, entityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!userId) return { ok: false as const, error: 'Sign in to upload attachments.' };
      if (!entityId) return { ok: false as const, error: 'Select a note/quest first.' };

      const list = Array.isArray(files) ? files : Array.from(files);
      if (list.length === 0) return { ok: true as const };

      setLoading(true);
      setError(null);

      try {
        for (const file of list) {
          // Basic client-side limit (you can increase later)
          const maxBytes = 1 * 1024 * 1024; // 1MB
          if (file.size > maxBytes) {
            throw new Error(`File too large: ${file.name} (${formatBytes(file.size)}). Max 1MB.`);
          }

          const stamp = Date.now();
          const clean = safeFileName(file.name) || `file_${stamp}`;
          const path = `${userId}/${entityType}/${entityId}/${stamp}_${clean}`;

          const up = await supabase.storage.from('attachments').upload(path, file, { upsert: true });
          if (up.error) throw up.error;

          const meta = {
            user_id: userId,
            entity_type: entityType,
            entity_id: entityId,
            storage_path: path,
            file_name: file.name,
            mime_type: file.type || null,
            size_bytes: file.size || null,
          };

          const { error: dbErr } = await supabase.from('attachments').insert(meta);
          if (dbErr) throw dbErr;
        }

        await refresh();
        return { ok: true as const };
      } catch (e: any) {
        setError(e?.message || 'Upload failed');
        return { ok: false as const, error: e?.message || 'Upload failed' };
      } finally {
        setLoading(false);
      }
    },
    [userId, entityType, entityId, refresh]
  );

  const remove = useCallback(
    async (row: AttachmentRow) => {
      if (!userId) return { ok: false as const, error: 'Sign in to delete attachments.' };
      setLoading(true);
      setError(null);
      try {
        const del = await supabase.storage.from('attachments').remove([row.storage_path]);
        if (del.error) throw del.error;

        const { error: dbErr } = await supabase.from('attachments').delete().eq('id', row.id).eq('user_id', userId);
        if (dbErr) throw dbErr;

        await refresh();
        return { ok: true as const };
      } catch (e: any) {
        setError(e?.message || 'Delete failed');
        return { ok: false as const, error: e?.message || 'Delete failed' };
      } finally {
        setLoading(false);
      }
    },
    [userId, refresh]
  );

  const openSignedUrl = useCallback(async (row: AttachmentRow) => {
    setError(null);
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(row.storage_path, 60 * 10);
    if (error) {
      setError(error.message);
      return { ok: false as const, error: error.message };
    }
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    }
    return { ok: true as const };
  }, []);

  return { rows, loading, error, canUse, refresh, uploadFiles, remove, openSignedUrl, formatBytes };
}
