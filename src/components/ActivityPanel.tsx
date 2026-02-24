import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, RefreshCcw, Trash2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseActivityLog } from '../hooks/useSupabaseActivityLog';

function prettyType(t: string) {
  return t
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m: string) => m.toUpperCase());
}

function iconFor(eventType: string) {
  if (eventType.includes('completed')) return '✅';
  if (eventType.includes('created')) return '➕';
  if (eventType.includes('deleted')) return '🗑️';
  if (eventType.includes('profile')) return '👤';
  if (eventType.includes('mood')) return '🧠';
  return '📝';
}

export function ActivityPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isDark, isHinglish } = useTheme();

  const {
    rows: rawRows,
    loading,
    error,
    refresh,
    clearAll,
  } = useSupabaseActivityLog({ enabled: open, limit: 120 });

  const rows = Array.isArray(rawRows) ? rawRows : [];

  const [filter, setFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.event_type === filter);
  }, [filter, rows]);

  const eventTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.event_type));
    return ['all', ...Array.from(set).sort()];
  }, [rows]);

  const card = isHinglish
    ? 'bg-white/85 backdrop-blur-xl border border-rose-200/30 shadow-2xl'
    : isDark
      ? 'bg-[#0C0C1A]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl'
      : 'bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-2xl';

  const tp = isHinglish ? 'text-slate-900' : isDark ? 'text-slate-100' : 'text-slate-900';
  const ts = isHinglish ? 'text-slate-600' : isDark ? 'text-slate-400' : 'text-slate-500';

  const btnSoft = isHinglish
    ? 'bg-white/80 border border-rose-200/40 hover:bg-white'
    : isDark
      ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06]'
      : 'bg-white/80 border border-slate-200/70 hover:bg-white';

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!open || !portalTarget) return null;

  async function copyPayload(id: string, payload: unknown) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload ?? {}, null, 2));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1000);
    } catch {
      // ignore
    }
  }

  async function onClear() {
    const ok = window.confirm(isHinglish ? 'Saara activity log delete kare?' : 'Delete all activity log entries?');
    if (!ok) return;
    await clearAll();
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close activity"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      <div className={`relative w-full max-w-4xl rounded-3xl ${card} overflow-hidden`}>
        <div className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-white/[0.06]">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>
              {isHinglish ? 'Cloud' : 'Cloud'}
            </div>
            <h3 className={`mt-1 text-lg md:text-xl font-black ${tp}`}>
              {isHinglish ? 'Activity Timeline' : 'Activity Timeline'}
            </h3>
            <p className={`mt-1 text-[12px] ${ts}`}>
              {isHinglish
                ? 'Yahan tumhare actions ka log save hota hai (sirf tumhara, RLS).'
                : 'A simple audit trail of your actions (only your rows, protected by RLS).'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void refresh()}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2 ${btnSoft}`}
              disabled={loading}
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
              {isHinglish ? 'Refresh' : 'Refresh'}
            </button>

            <button
              onClick={() => void onClear()}
              className={`px-3 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2 ${btnSoft}`}
              disabled={loading || rows.length === 0}
            >
              <Trash2 size={16} />
              {isHinglish ? 'Clear' : 'Clear'}
            </button>

            <button onClick={onClose} className={`p-2 rounded-xl ${btnSoft}`} aria-label="Close">
              <X size={18} className={ts} />
            </button>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className={`text-[12px] ${ts}`}>
              {isHinglish ? 'Filter:' : 'Filter:'}
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-[13px] outline-none ${
                isHinglish
                  ? 'bg-white/80 border border-rose-200/40 text-slate-900'
                  : isDark
                    ? 'bg-white/[0.03] border border-white/[0.08] text-slate-100'
                    : 'bg-white/80 border border-slate-200/70 text-slate-900'
              }`}
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'all' ? (isHinglish ? 'All events' : 'All events') : t}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <div className="mt-4 text-[12px] text-[tomato]">{error}</div>
          ) : null}

          <div className="mt-4 max-h-[60vh] overflow-auto rounded-2xl">
            {filtered.length === 0 ? (
              <div className={`p-4 text-[12px] ${ts}`}>
                {isHinglish ? 'Abhi koi activity nahi.' : 'No activity yet.'}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {filtered.map((r) => (
                  <div key={r.id} className="p-4 flex items-start gap-3">
                    <div className="text-xl leading-none mt-0.5">{iconFor(r.event_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] font-bold ${tp}`}>
                        {prettyType(r.event_type)}
                        {r.entity_type ? (
                          <span className={`ml-2 text-[11px] font-semibold ${ts}`}>
                            ({r.entity_type})
                          </span>
                        ) : null}
                      </div>
                      <div className={`mt-0.5 text-[11px] ${ts} break-words`}>
                        {new Date(r.created_at).toLocaleString()}
                        {r.entity_id ? <span className="ml-2">• id: {r.entity_id}</span> : null}
                      </div>
                      {r.payload ? (
                        <div className={`mt-2 text-[11px] ${ts} break-words`}>
                          {typeof r.payload === 'string' ? r.payload : JSON.stringify(r.payload)}
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => void copyPayload(r.id, r.payload)}
                      className={`p-2 rounded-xl ${btnSoft}`}
                      title={isHinglish ? 'Copy payload' : 'Copy payload'}
                    >
                      <Copy
                        size={16}
                        className={
                          copiedId === r.id
                            ? isHinglish
                              ? 'text-rose-600'
                              : isDark
                                ? 'text-indigo-300'
                                : 'text-indigo-600'
                            : ts
                        }
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
