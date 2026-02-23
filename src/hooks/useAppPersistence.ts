import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight persistence helper.
 *
 * This project does NOT use Zustand; the app state lives in React useState.
 * Keep this hook here so you can plug persistence in without changing features.
 *
 * ✅ Updated: restores again if `key` (or `version`) changes.
 * This is required for multi-user apps where storage keys are per-user.
 */
export function useAppPersistence<T extends object>(opts: {
  key?: string;
  version?: string;
  snapshot: T;
  restore: (restored: T) => void;
}) {
  const STORAGE_KEY = opts.key ?? 'karmquest-app-state';
  const APP_VERSION = opts.version ?? '1.0.0';

  // Prevent "save defaults" from overwriting a user's stored state on first boot.
  // Also prevents double-restore in React Strict Mode.
  const [hydrated, setHydrated] = useState(false);
  const restoredMarkerRef = useRef<string | null>(null);

  // Restore state when key/version changes
  useEffect(() => {
    const marker = `${STORAGE_KEY}::${APP_VERSION}`;
    if (restoredMarkerRef.current === marker) return;
    restoredMarkerRef.current = marker;

    setHydrated(false);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { version: string; snapshot: T };
        if (parsed && parsed.version === APP_VERSION && parsed.snapshot) {
          opts.restore(parsed.snapshot);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY, APP_VERSION]);

  // Save state on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: APP_VERSION, snapshot: opts.snapshot }));
    } catch {
      // ignore quota/security errors
    }
  }, [hydrated, STORAGE_KEY, APP_VERSION, opts.snapshot]);

  return { hydrated };
}
