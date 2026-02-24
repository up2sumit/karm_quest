import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type BackupMeta = {
  id: string;
  app_key: string;
  label: string;
  version: string;
  created_at: string;
};

export type BackupFull = BackupMeta & {
  snapshot: unknown;
};

export function useSupabaseBackups(opts: {
  enabled: boolean;
  userId: string | null;
  appKey: string;
  /** how many backups to show */
  limit?: number;
}) {
  const enabled = opts.enabled;
  const userId = opts.userId;
  const appKey = opts.appKey;
  const limit = opts.limit ?? 20;

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [items, setItems] = useState<BackupMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ready = useMemo(() => enabled && !!userId, [enabled, userId]);

  const refresh = useCallback(async () => {
    if (!ready || !userId) {
      setItems([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await supabase
        .from('user_backups')
        .select('id,app_key,label,version,created_at')
        .eq('user_id', userId)
        .eq('app_key', appKey)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (res.error) throw res.error;
      setItems((res.data as BackupMeta[]) ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ready, userId, appKey, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createBackup = useCallback(
    async (label: string) => {
      if (!ready) return { ok: false as const, error: 'Not signed in' };
      setCreating(true);
      setError(null);
      try {
        const res = await supabase.rpc('create_user_backup', {
          p_app_key: appKey,
          p_label: label,
        });
        if (res.error) throw res.error;
        await refresh();
        return { ok: true as const, id: String(res.data ?? '') };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return { ok: false as const, error: msg };
      } finally {
        setCreating(false);
      }
    },
    [ready, appKey, refresh]
  );

  const fetchBackupSnapshot = useCallback(
    async (backupId: string) => {
      if (!ready || !userId) return { ok: false as const, error: 'Not signed in' };
      try {
        const res = await supabase
          .from('user_backups')
          .select('id,app_key,label,version,created_at,snapshot')
          .eq('id', backupId)
          .eq('user_id', userId)
          .maybeSingle();
        if (res.error) throw res.error;
        if (!res.data) return { ok: false as const, error: 'Backup not found' };
        return { ok: true as const, backup: res.data as BackupFull };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false as const, error: msg };
      }
    },
    [ready, userId]
  );

  const restoreBackup = useCallback(
    async (backupId: string) => {
      if (!ready) return { ok: false as const, error: 'Not signed in' };
      setRestoring(backupId);
      setError(null);
      try {
        // Server-side restore updates user_state atomically.
        const res = await supabase.rpc('restore_user_backup', { p_backup_id: backupId });
        if (res.error) throw res.error;
        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return { ok: false as const, error: msg };
      } finally {
        setRestoring(null);
      }
    },
    [ready]
  );

  const deleteBackup = useCallback(
    async (backupId: string) => {
      if (!ready || !userId) return { ok: false as const, error: 'Not signed in' };
      setDeleting(backupId);
      setError(null);
      try {
        const res = await supabase.from('user_backups').delete().eq('id', backupId).eq('user_id', userId);
        if (res.error) throw res.error;
        await refresh();
        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        return { ok: false as const, error: msg };
      } finally {
        setDeleting(null);
      }
    },
    [ready, userId, refresh]
  );

  return {
    ready,
    loading,
    creating,
    restoring,
    deleting,
    items,
    error,
    refresh,
    createBackup,
    fetchBackupSnapshot,
    restoreBackup,
    deleteBackup,
  };
}
