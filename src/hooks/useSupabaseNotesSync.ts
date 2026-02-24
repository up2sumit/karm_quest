import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { enqueueNotesFullSync } from '../lib/offlineQueue';
import type { Note } from '../store';

type NoteRowUpsert = {
  user_id: string;
  note_id: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  emoji: string;
  created_at: string;
};

type NoteRow = {
  user_id: string;
  note_id: string;
  title: string;
  content: string;
  tags: string[] | null;
  color: string;
  emoji: string;
  created_at: string;
  updated_at: string;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function rowToNote(r: NoteRow): Note {
  return {
    id: String(r.note_id),
    title: r.title ?? '',
    content: r.content ?? '',
    tags: Array.isArray(r.tags) ? r.tags : [],
    color: r.color ?? '#6366F1',
    emoji: r.emoji ?? '📜',
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function looksLikeConstraintError(msg: string) {
  const m = msg.toLowerCase();
  return m.includes('on conflict') || m.includes('on_conflict') || m.includes('no unique') || m.includes('there is no unique') || m.includes('constraint');
}

function looksLikeSchemaMismatch(msg: string) {
  const m = msg.toLowerCase();
  return (m.includes('column') && m.includes('does not exist')) || (m.includes('relation') && m.includes('notes'));
}

function isLikelyNetworkError(msg: string) {
  const m = msg.toLowerCase();
  return m.includes('failed to fetch') || m.includes('network') || m.includes('offline') || m.includes('timeout');
}

/**
 * Notes mirror into Supabase `notes`.
 * Phase 9 upgrade:
 * - If offline/network fails, queue a "full sync" payload.
 * - OfflineSyncBootstrap flushes it when online.
 */
export function useSupabaseNotesSync(opts: {
  enabled: boolean;
  userId: string | null;
  notes: Note[];
  onRemoteNotes: (notes: Note[]) => void;
  debounceMs?: number;
}) {
  const { enabled, userId, notes, onRemoteNotes } = opts;
  const debounceMs = opts.debounceMs ?? 900;

  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [queued, setQueued] = useState(false);

  const timerRef = useRef<number | null>(null);
  const lastHashRef = useRef<string>('');
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const upsertSupportedRef = useRef<boolean | null>(null);

  // Remember if UPSERT is supported
  useEffect(() => {
    if (!userId) {
      upsertSupportedRef.current = null;
      return;
    }
    try {
      const v = window.localStorage.getItem(`karmquest_notes_upsert:${userId}`);
      if (v === '0') upsertSupportedRef.current = false;
      else if (v === '1') upsertSupportedRef.current = true;
      else upsertSupportedRef.current = null;
    } catch {
      upsertSupportedRef.current = null;
    }
  }, [userId]);

  const payload = useMemo<NoteRowUpsert[]>(() => {
    if (!userId) return [];
    return notes.map((n) => ({
      user_id: userId,
      note_id: String(n.id),
      title: n.title ?? '',
      content: n.content ?? '',
      tags: Array.isArray(n.tags) ? n.tags : [],
      color: n.color ?? '#6366F1',
      emoji: n.emoji ?? '📜',
      created_at: n.createdAt ?? new Date().toISOString(),
    }));
  }, [notes, userId]);

  const fetchAll = useRef(async () => {
    if (!userId) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const { data, error: e } = await supabase
      .from('notes')
      .select('user_id,note_id,title,content,tags,color,emoji,created_at,updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (e) {
      setError(e.message);
      return;
    }

    const rows = (data as NoteRow[] | null) ?? [];
    onRemoteNotes(rows.map(rowToNote));
  });

  // Initial fetch + realtime subscribe
  useEffect(() => {
    if (!enabled || !userId) {
      subRef.current?.unsubscribe();
      subRef.current = null;
      setError(null);
      setLastSyncedAt(null);
      setSyncing(false);
      setQueued(false);
      lastHashRef.current = '';
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }

    void fetchAll.current();

    subRef.current?.unsubscribe();
    subRef.current = supabase
      .channel(`notes:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` }, () => {
        void fetchAll.current();
      })
      .subscribe();

    return () => {
      subRef.current?.unsubscribe();
      subRef.current = null;
    };
  }, [enabled, userId, onRemoteNotes]);

  // Debounced mirror writes
  useEffect(() => {
    if (!enabled || !userId) return;

    const hash = JSON.stringify(payload);
    if (hash === lastHashRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(async () => {
      setSyncing(true);
      setError(null);
      setQueued(false);

      // Offline: queue latest payload
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueueNotesFullSync({ user_id: userId, notes: payload });
        lastHashRef.current = hash;
        setQueued(true);
        setSyncing(false);
        return;
      }

      try {
        // 1) UPSERT fast-path
        let mustFullReplace = upsertSupportedRef.current === false;

        if (!mustFullReplace) {
          for (const batch of chunk(payload, 200)) {
            const res = await supabase.from('notes').upsert(batch, { onConflict: 'user_id,note_id' });
            if (res.error) {
              if (looksLikeConstraintError(res.error.message)) {
                mustFullReplace = true;
                upsertSupportedRef.current = false;
                try {
                  window.localStorage.setItem(`karmquest_notes_upsert:${userId}`, '0');
                } catch {
                  // ignore
                }
                break;
              }
              throw res.error;
            }
          }

          if (!mustFullReplace) {
            upsertSupportedRef.current = true;
            try {
              window.localStorage.setItem(`karmquest_notes_upsert:${userId}`, '1');
            } catch {
              // ignore
            }
          }
        }

        // 2) Fallback: DELETE + INSERT
        if (mustFullReplace) {
          const del = await supabase.from('notes').delete().eq('user_id', userId);
          if (del.error) throw del.error;

          for (const batch of chunk(payload, 200)) {
            const ins = await supabase.from('notes').insert(batch);
            if (ins.error) throw ins.error;
          }

          lastHashRef.current = hash;
          setLastSyncedAt(Date.now());
          return;
        }

        // 3) Delete missing
        const { data: existing, error: selErr } = await supabase.from('notes').select('note_id').eq('user_id', userId).limit(2000);
        if (selErr) throw selErr;

        const existingIds = new Set(((existing as { note_id: string }[] | null) ?? []).map((r) => String(r.note_id)));
        const currentIds = new Set(payload.map((p) => p.note_id));
        const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

        for (const delBatch of chunk(toDelete, 200)) {
          const delRes = await supabase.from('notes').delete().eq('user_id', userId).in('note_id', delBatch);
          if (delRes.error) throw delRes.error;
        }

        lastHashRef.current = hash;
        setLastSyncedAt(Date.now());
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);

        if (isLikelyNetworkError(msg)) {
          enqueueNotesFullSync({ user_id: userId, notes: payload });
          lastHashRef.current = hash;
          setQueued(true);
          setError('Offline: changes queued');
        } else if (looksLikeSchemaMismatch(msg)) {
          setError(
            'Notes sync failed because your DB notes table schema is different. Fix: run supabase/phase6.sql again. If you created notes table earlier with different columns, rename it and recreate using phase6.sql.'
          );
        } else if (msg.toLowerCase().includes('not authenticated') || msg.toLowerCase().includes('jwt')) {
          setError('Not signed in (auth token missing). Please sign in again.');
        } else {
          setError(msg);
        }
      } finally {
        setSyncing(false);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, userId, payload, debounceMs]);

  const search = async (q: string, tagsFilter?: string[]) => {
    if (!enabled || !userId) return [];

    const { data, error: e } = await supabase.rpc('search_notes', {
      q: q ?? '',
      tags_filter: tagsFilter ?? null,
      limit_n: 100,
    });

    if (e) throw e;
    const rows = (data as NoteRow[] | null) ?? [];
    return rows.map(rowToNote);
  };

  return { syncing, error, lastSyncedAt, refresh: () => fetchAll.current(), search, queued };
}
