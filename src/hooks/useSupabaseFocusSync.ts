import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { FocusHistoryEntry } from '../store';

/**
 * Lightweight cloud sync for focus sessions.
 *
 * On every new local focus-history entry, we call the idempotent
 * `log_focus_session` RPC. If offline, the entry is queued in
 * localStorage; the queue is flushed when the user comes back online.
 *
 * The RPC uses (quest_id + started_at) as a natural dedup key, so
 * replaying queued entries is always safe.
 */
export function useSupabaseFocusSync(opts: {
    userId: string | null;
    focusHistory: FocusHistoryEntry[];
}) {
    const { userId, focusHistory } = opts;

    // Track which entries have been synced (by id)
    const syncedRef = useRef(new Set<string>());
    const queueKey = userId ? `karmquest_focus_queue_v1:${userId}` : null;

    // ── Read / Write queue ───────────────────────────────────────────────────

    const readQueue = useCallback((): FocusHistoryEntry[] => {
        if (!queueKey) return [];
        try {
            const raw = localStorage.getItem(queueKey);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [queueKey]);

    const writeQueue = useCallback(
        (entries: FocusHistoryEntry[]) => {
            if (!queueKey) return;
            try {
                localStorage.setItem(queueKey, JSON.stringify(entries.slice(-200)));
            } catch {
                // ignore
            }
        },
        [queueKey]
    );

    // ── Sync a single entry ──────────────────────────────────────────────────

    const syncEntry = useCallback(
        async (entry: FocusHistoryEntry): Promise<boolean> => {
            if (!userId) return false;
            try {
                const { error } = await supabase.rpc('log_focus_session', {
                    p_quest_id: entry.questId,
                    p_quest_title: entry.questTitle,
                    p_started_at: new Date(entry.startedAt).toISOString(),
                    p_ended_at: new Date(entry.endedAt).toISOString(),
                    p_duration_ms: entry.durationMs,
                    p_label: entry.label,
                    p_xp_awarded: entry.xpAwarded,
                    p_day: entry.day,
                });
                if (error) throw error;
                return true;
            } catch {
                return false;
            }
        },
        [userId]
    );

    // ── Flush the offline queue ──────────────────────────────────────────────

    const flushQueue = useCallback(async () => {
        if (!userId || !queueKey) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

        const queue = readQueue();
        if (queue.length === 0) return;

        const remaining: FocusHistoryEntry[] = [];
        for (const entry of queue) {
            const ok = await syncEntry(entry);
            if (!ok) {
                remaining.push(entry);
                break; // stop on first failure (likely offline)
            }
            syncedRef.current.add(entry.id);
        }
        writeQueue(remaining);
    }, [userId, queueKey, readQueue, writeQueue, syncEntry]);

    // ── Watch for new entries ────────────────────────────────────────────────

    const lastLenRef = useRef(focusHistory.length);

    useEffect(() => {
        if (!userId) return;
        const prevLen = lastLenRef.current;
        lastLenRef.current = focusHistory.length;

        if (focusHistory.length <= prevLen) return;

        // Sync only the new entries
        const newEntries = focusHistory.slice(prevLen);
        for (const entry of newEntries) {
            if (syncedRef.current.has(entry.id)) continue;

            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                // Queue for later
                const queue = readQueue();
                queue.push(entry);
                writeQueue(queue);
            } else {
                // Try immediate sync; queue on failure
                void syncEntry(entry).then((ok) => {
                    if (ok) {
                        syncedRef.current.add(entry.id);
                    } else {
                        const q = readQueue();
                        q.push(entry);
                        writeQueue(q);
                    }
                });
            }
        }
    }, [userId, focusHistory, readQueue, writeQueue, syncEntry]);

    // ── Online flush ─────────────────────────────────────────────────────────

    useEffect(() => {
        if (!userId) return;
        void flushQueue();
    }, [userId, flushQueue]);

    useEffect(() => {
        const onOnline = () => void flushQueue();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [flushQueue]);
}
