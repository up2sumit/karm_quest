// NOTE: Keep this module dependency-light.
// We intentionally do NOT import date helpers from store.ts to avoid circular imports
// (store.ts also needs weekStart/End helpers for due-date parsing).

export function addDaysISO(baseISO: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baseISO)) return '';
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // Calendar arithmetic (DST-safe)
  dt.setDate(dt.getDate() + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Monday-start week start for a given date (local time) as YYYY-MM-DD. */
export function weekStartISO(d: Date = new Date()): string {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = local.getDay(); // 0 Sun ... 6 Sat
  const mondayIndex = (day + 6) % 7; // Mon=0, Tue=1, ... Sun=6
  local.setDate(local.getDate() - mondayIndex);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Week start (Monday) computed from an ISO date string (YYYY-MM-DD). */
export function weekStartFromISO(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return weekStartISO(new Date(y, m - 1, d));
}

/** End of week (Sunday) as YYYY-MM-DD for a given weekStartISO. */
export function weekEndFromWeekStart(weekStart: string): string {
  if (!weekStart) return '';
  return addDaysISO(weekStart, 6);
}
