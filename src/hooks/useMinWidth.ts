import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is at least `minWidthPx` wide.
 * Uses matchMedia so it updates immediately on resize/orientation change.
 */
export function useMinWidth(minWidthPx: number): boolean {
  const get = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(min-width: ${minWidthPx}px)`).matches;
  };

  const [matches, setMatches] = useState<boolean>(get);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const onChange = () => setMatches(mql.matches);

    // Set once (covers first render mismatch)
    onChange();

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Older Safari fallback
    const anyMql = mql as unknown as { addListener?: (cb: () => void) => void; removeListener?: (cb: () => void) => void };
    if (typeof anyMql.addListener === 'function') {
      anyMql.addListener(onChange);
      return () => anyMql.removeListener?.(onChange);
    }

    return;
  }, [minWidthPx]);

  return matches;
}
