// src/lib/offlineQueue.ts
// Phase 9: Offline-first queue for Supabase writes.
// Stores the *latest* pending operation per key (dedup), then flushes when online.

import type { SupabaseClient } from '@supabase/supabase-js';

export type OfflineOp =
  | {
      kind: 'user_state_upsert';
      key: string;
      user_id: string;
      app_key: string;
      version: string;
      snapshot: unknown;
      updatedAt: number;
    }
  | {
      kind: 'tasks_full_sync';
      key: string;
      user_id: string;
      tasks: any[]; // row payload for tasks table
      updatedAt: number;
    }
  | {
      kind: 'notes_full_sync';
      key: string;
      user_id: string;
      notes: any[]; // row payload for notes table
      updatedAt: number;
    };

type QueueState = {
  v: 1;
  ops: Record<string, OfflineOp>;
};

const STORAGE_KEY = 'karmquest_offline_queue_v1';

function load(): QueueState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { v: 1, ops: {} };
    const parsed = JSON.parse(raw) as QueueState;
    if (!parsed || parsed.v !== 1 || typeof parsed.ops !== 'object') return { v: 1, ops: {} };
    return parsed;
  } catch {
    return { v: 1, ops: {} };
  }
}

function save(state: QueueState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (storage full, private mode etc)
  }
}

export function pendingCount(userId?: string | null): number {
  const st = load();
  const all = Object.values(st.ops);
  return userId ? all.filter((o) => o.user_id === userId).length : all.length;
}

export function listOps(userId?: string | null): OfflineOp[] {
  const st = load();
  const all = Object.values(st.ops);
  const filtered = userId ? all.filter((o) => o.user_id === userId) : all;
  return filtered.sort((a, b) => a.updatedAt - b.updatedAt);
}

function upsertOp(op: OfflineOp) {
  const st = load();
  st.ops[op.key] = op; // dedup by key
  save(st);
}

export function enqueueUserState(params: {
  user_id: string;
  app_key: string;
  version: string;
  snapshot: unknown;
}) {
  upsertOp({
    kind: 'user_state_upsert',
    key: `user_state:${params.user_id}:${params.app_key}`,
    user_id: params.user_id,
    app_key: params.app_key,
    version: params.version,
    snapshot: params.snapshot,
    updatedAt: Date.now(),
  });
}

export function enqueueTasksFullSync(params: { user_id: string; tasks: any[] }) {
  upsertOp({
    kind: 'tasks_full_sync',
    key: `tasks_full:${params.user_id}`,
    user_id: params.user_id,
    tasks: params.tasks,
    updatedAt: Date.now(),
  });
}

export function enqueueNotesFullSync(params: { user_id: string; notes: any[] }) {
  upsertOp({
    kind: 'notes_full_sync',
    key: `notes_full:${params.user_id}`,
    user_id: params.user_id,
    notes: params.notes,
    updatedAt: Date.now(),
  });
}

export function clearUser(userId: string) {
  const st = load();
  for (const k of Object.keys(st.ops)) {
    if (st.ops[k]?.user_id === userId) delete st.ops[k];
  }
  save(st);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function flushOne(client: SupabaseClient, op: OfflineOp) {
  if (op.kind === 'user_state_upsert') {
    const payload = {
      user_id: op.user_id,
      app_key: op.app_key,
      version: op.version,
      snapshot: op.snapshot,
    };
    const { error } = await client.from('user_state').upsert(payload, { onConflict: 'user_id,app_key' });
    if (error) throw error;
    return;
  }

  if (op.kind === 'tasks_full_sync') {
    // Upsert tasks
    for (const batch of chunk(op.tasks, 200)) {
      const { error } = await client.from('tasks').upsert(batch, { onConflict: 'user_id,quest_id' });
      if (error) throw error;
    }

    // Reconcile deletes
    const { data: existing, error: selErr } = await client
      .from('tasks')
      .select('quest_id')
      .eq('user_id', op.user_id)
      .limit(5000);
    if (selErr) throw selErr;

    const existingIds = new Set(((existing as { quest_id: string }[] | null) ?? []).map((r) => String(r.quest_id)));
    const currentIds = new Set(op.tasks.map((t: any) => String(t.quest_id)));
    const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

    for (const delBatch of chunk(toDelete, 200)) {
      const { error } = await client.from('tasks').delete().eq('user_id', op.user_id).in('quest_id', delBatch);
      if (error) throw error;
    }
    return;
  }

  if (op.kind === 'notes_full_sync') {
    // Safe strategy: upsert in batches, then reconcile deletes.
    // This prevents data loss if a sync is interrupted mid-operation.
    for (const batch of chunk(op.notes, 200)) {
      const { error } = await client.from('notes').upsert(batch, { onConflict: 'user_id,note_id' });
      if (error) throw error;
    }

    // Reconcile deletes: remove server rows that no longer exist locally
    const { data: existing, error: selErr } = await client
      .from('notes')
      .select('note_id')
      .eq('user_id', op.user_id)
      .limit(5000);
    if (selErr) throw selErr;

    const existingIds = new Set(((existing as { note_id: string }[] | null) ?? []).map((r) => String(r.note_id)));
    const currentIds = new Set(op.notes.map((n: any) => String(n.note_id)));
    const toDelete = [...existingIds].filter((id) => !currentIds.has(id));

    for (const delBatch of chunk(toDelete, 200)) {
      const { error } = await client.from('notes').delete().eq('user_id', op.user_id).in('note_id', delBatch);
      if (error) throw error;
    }
    return;
  }
}

export async function flushQueue(client: SupabaseClient, opts?: { userId?: string | null; maxOps?: number }) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Offline');
  }

  const userId = opts?.userId ?? null;
  const maxOps = opts?.maxOps ?? 50;

  const st = load();
  const ops = Object.values(st.ops)
    .filter((o) => (userId ? o.user_id === userId : true))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .slice(0, maxOps);

  for (const op of ops) {
    await flushOne(client, op);
    // remove on success
    const current = load();
    delete current.ops[op.key];
    save(current);
  }

  return { flushed: ops.length, remaining: pendingCount(userId) };
}
