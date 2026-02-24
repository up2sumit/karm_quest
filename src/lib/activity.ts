import { supabase } from './supabase';

export type ActivityEvent = {
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: unknown;
};

/**
 * Lightweight client-side activity logger.
 *
 * - Safe for guests: no-op if not signed in.
 * - Uses RPC if available (preferred), otherwise falls back to direct insert.
 */
export async function logActivity(event: ActivityEvent): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return; // guest mode

    const payload = (event.payload ?? {}) as any;

    // Prefer RPC (keeps user_id server-side via auth.uid())
    const rpcRes = await supabase.rpc('log_activity', {
      event_type: event.eventType,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      payload,
    });

    if (!rpcRes.error) return;

    // Fallback: direct insert (requires insert policy user_id = auth.uid())
    await supabase.from('activity_log').insert({
      user_id: uid,
      event_type: event.eventType,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      payload,
    });
  } catch {
    // Deliberately silent: activity logging should never break the app.
  }
}
