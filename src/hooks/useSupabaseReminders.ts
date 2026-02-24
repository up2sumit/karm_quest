import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ReminderEntityType = 'task' | 'note';
export type ReminderStatus = 'pending' | 'sent' | 'cancelled';

export type ReminderRow = {
  id: string;
  user_id: string;
  entity_type: ReminderEntityType;
  entity_id: string;
  title: string | null;
  remind_at: string; // timestamptz ISO
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

function toIsoSafe(d: Date): string {
  // Always store as ISO in UTC
  return d.toISOString();
}

export function useSupabaseReminders(opts: {
  enabled: boolean;
  userId: string | null;
}) {
  const { enabled, userId } = opts;

  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upcoming = useMemo(
    () => reminders.filter((r) => r.status === 'pending').sort((a, b) => a.remind_at.localeCompare(b.remind_at)),
    [reminders]
  );
  const history = useMemo(
    () => reminders.filter((r) => r.status !== 'pending').sort((a, b) => b.remind_at.localeCompare(a.remind_at)),
    [reminders]
  );

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setReminders([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: e } = await supabase
        .from('reminders')
        .select('id,user_id,entity_type,entity_id,title,remind_at,status,sent_at,created_at,updated_at')
        .eq('user_id', userId)
        .order('remind_at', { ascending: true })
        .limit(500);

      if (e) throw e;
      setReminders((data as ReminderRow[]) ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createReminder = useCallback(
    async (input: { entityType: ReminderEntityType; entityId: string; title?: string; remindAt: Date | string }) => {
      if (!enabled || !userId) return { ok: false as const, error: 'Not signed in' };

      setError(null);
      try {
        const remind_at =
          typeof input.remindAt === 'string'
            ? input.remindAt
            : toIsoSafe(input.remindAt);

        const { error: e } = await supabase.from('reminders').insert({
          user_id: userId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          title: input.title ?? null,
          remind_at,
          status: 'pending',
        });
        if (e) throw e;

        await refresh();
        return { ok: true as const };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        return { ok: false as const, error: msg };
      }
    },
    [enabled, refresh, userId]
  );

  const cancelReminder = useCallback(
    async (id: string) => {
      if (!enabled || !userId) return;
      setError(null);
      try {
        const { error: e } = await supabase
          .from('reminders')
          .update({ status: 'cancelled' })
          .eq('user_id', userId)
          .eq('id', id);
        if (e) throw e;
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    },
    [enabled, refresh, userId]
  );

  const deleteReminder = useCallback(
    async (id: string) => {
      if (!enabled || !userId) return;
      setError(null);
      try {
        const { error: e } = await supabase
          .from('reminders')
          .delete()
          .eq('user_id', userId)
          .eq('id', id);
        if (e) throw e;
        await refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      }
    },
    [enabled, refresh, userId]
  );

  return {
    reminders,
    upcoming,
    history,
    loading,
    error,
    refresh,
    createReminder,
    cancelReminder,
    deleteReminder,
  };
}
