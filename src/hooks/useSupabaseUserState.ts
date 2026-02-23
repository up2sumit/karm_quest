import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Stores the entire app snapshot per-user in Supabase (JSONB).
 *
 * Table: user_state
 * Columns: user_id (uuid PK), app_key (text), version (text), snapshot (jsonb), updated_at (timestamptz)
 *
 * RLS:
 *   - user can only select/insert/update where auth.uid() = user_id
 */
export function useSupabaseUserState<T extends object>(opts: {
  enabled: boolean;
  userId: string | null;
  appKey: string; // e.g. "karmquest"
  version: string; // e.g. "1.3.0"
  snapshot: T;
  restore: (s: T) => void;
  /** Debounce writes to avoid spamming network. Default 900ms */
  debounceMs?: number;
}) {
  const { enabled, userId, appKey, version, snapshot, restore } = opts;
  const debounceMs = opts.debounceMs ?? 900;

  // Keep latest snapshot/version in refs for seeding.
  // IMPORTANT: Do NOT put `snapshot` in the "remote hydrate" effect dependency list.
  // On app boot, many state updates happen quickly; if `snapshot` is a dependency,
  // React will cancel the in-flight fetch/seed, and our guard can prevent a re-fetch.
  // Result: remoteHydrated stays false and nothing is written.
  const latestSnapshotRef = useRef<T>(snapshot);
  const latestVersionRef = useRef<string>(version);
  useEffect(() => {
    latestSnapshotRef.current = snapshot;
    latestVersionRef.current = version;
  }, [snapshot, version]);

  const [remoteHydrated, setRemoteHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreGuard = useRef(false);
  const didFetchKey = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastSavedHash = useRef<string>("");

  const activeKey = useMemo(() => (userId ? `${appKey}:${userId}` : null), [appKey, userId]);

  useEffect(() => {
    if (!enabled || !userId || !activeKey) {
      setRemoteHydrated(false);
      setSaving(false);
      setError(null);
      didFetchKey.current = null;
      return;
    }

    if (didFetchKey.current === activeKey) return;
    didFetchKey.current = activeKey;

    let cancelled = false;
    (async () => {
      setError(null);
      setRemoteHydrated(false);

      const { data, error: e } = await supabase
        .from("user_state")
        .select("version,snapshot")
        .eq("user_id", userId)
        .eq("app_key", appKey)
        .maybeSingle();

      if (cancelled) return;

      if (e) {
        setError(e.message);
        setRemoteHydrated(true); // allow local-only to continue
        return;
      }

      if (data?.snapshot) {
        // Restore (even if version differs); your restore() is already defensive.
        restoreGuard.current = true;
        try {
          restore(data.snapshot as T);
        } finally {
          // release guard in next tick
          setTimeout(() => {
            restoreGuard.current = false;
          }, 0);
        }
        lastSavedHash.current = JSON.stringify({ v: data.version, s: data.snapshot });
        setRemoteHydrated(true);
        return;
      }

      // First time user: seed remote with current snapshot
      const seedSnapshot = latestSnapshotRef.current;
      const seedVersion = latestVersionRef.current;
      const seed = { user_id: userId, app_key: appKey, version: seedVersion, snapshot: seedSnapshot };
      const { error: insErr } = await supabase.from("user_state").upsert(seed, { onConflict: "user_id,app_key" });
      if (insErr) setError(insErr.message);
      lastSavedHash.current = JSON.stringify({ v: seedVersion, s: seedSnapshot });
      setRemoteHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, appKey, restore, activeKey]);

  useEffect(() => {
    if (!enabled || !userId) return;
    if (!remoteHydrated) return;
    if (restoreGuard.current) return;

    const hash = JSON.stringify({ v: version, s: snapshot });
    if (hash === lastSavedHash.current) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      setError(null);

      const payload = { user_id: userId, app_key: appKey, version, snapshot };
      const { error: e } = await supabase.from("user_state").upsert(payload, { onConflict: "user_id,app_key" });

      if (e) setError(e.message);
      else lastSavedHash.current = hash;

      setSaving(false);
    }, debounceMs);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [enabled, userId, remoteHydrated, snapshot, version, debounceMs]);

  return { remoteHydrated, saving, error };
}
