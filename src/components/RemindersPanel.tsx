import { AlarmClock, CalendarClock, CheckCircle2, RefreshCcw, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { Note, Quest } from '../store';
import { useSupabaseReminders, type ReminderEntityType } from '../hooks/useSupabaseReminders';

function formatLocal(dtIso: string): string {
  try {
    const d = new Date(dtIso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dtIso;
  }
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RemindersPanel({ enabled, userId, quests, notes }: {
  enabled: boolean;
  userId: string | null;
  quests: Quest[];
  notes: Note[];
}) {
  const { isDark, isHinglish, isModern, lang } = useTheme();

  const {
    upcoming,
    history,
    loading,
    error,
    refresh,
    createReminder,
    cancelReminder,
    deleteReminder,
  } = useSupabaseReminders({ enabled, userId });

  const [entityType, setEntityType] = useState<ReminderEntityType>('task');
  const [entityId, setEntityId] = useState<string>('');
  const [whenLocal, setWhenLocal] = useState<string>(() => toDatetimeLocalValue(new Date(Date.now() + 10 * 60_000)));
  const [title, setTitle] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);

  const darkLike = isDark || isHinglish;

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-sm'
    : darkLike
      ? 'bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] shadow-sm'
      : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm';
  const tp = isModern ? 'text-[var(--kq-text-primary)]' : darkLike ? 'text-slate-100' : 'text-slate-900';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : darkLike ? 'text-slate-400' : 'text-slate-500';
  const btnPrimary = isModern
    ? 'bg-[var(--kq-primary)] hover:bg-[var(--kq-primary-light)]'
    : 'bg-gradient-to-r from-indigo-500 to-violet-500';
  const btnSoft = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] hover:bg-[var(--kq-primary-soft)]'
    : darkLike
      ? 'bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06]'
      : 'bg-white/70 border border-slate-200/60 hover:bg-white';

  const entityOptions = useMemo(() => {
    if (entityType === 'task') {
      return quests.map((q) => ({ id: String(q.id), label: q.title }));
    }
    return notes.map((n) => ({ id: String(n.id), label: n.title }));
  }, [entityType, notes, quests]);

  const quickSet = (kind: '10m' | '1h' | 'tomorrow9') => {
    const now = new Date();
    if (kind === '10m') setWhenLocal(toDatetimeLocalValue(new Date(now.getTime() + 10 * 60_000)));
    if (kind === '1h') setWhenLocal(toDatetimeLocalValue(new Date(now.getTime() + 60 * 60_000)));
    if (kind === 'tomorrow9') {
      const t = new Date(now);
      t.setDate(t.getDate() + 1);
      t.setHours(9, 0, 0, 0);
      setWhenLocal(toDatetimeLocalValue(t));
    }
  };

  const create = async () => {
    setMsg(null);

    if (!enabled || !userId) {
      setMsg(isHinglish ? 'Login karo, tab reminders work karenge.' : 'Please sign in to use reminders.');
      return;
    }

    const selected = entityOptions.find((e) => e.id === entityId);
    if (!entityId || !selected) {
      setMsg(lang === 'pro' ? 'Select a task or note first.' : (isHinglish ? 'Pehle quest/note select karo.' : 'Select a quest or note first.'));
      return;
    }

    if (!whenLocal) {
      setMsg(isHinglish ? 'Reminder time set karo.' : 'Set a reminder time.');
      return;
    }

    const when = new Date(whenLocal);
    if (Number.isNaN(when.getTime())) {
      setMsg(isHinglish ? 'Time invalid hai.' : 'Invalid time.');
      return;
    }

    const res = await createReminder({
      entityType,
      entityId,
      title: title.trim() || selected.label,
      remindAt: when,
    });

    if (res.ok) {
      setMsg(lang === 'pro' ? 'Reminder set ✅' : (isHinglish ? 'Reminder set ✅ (cron runs every minute)' : 'Reminder set ✅ (cron runs every minute)'));
      setTitle('');
    } else {
      setMsg(res.error || (isHinglish ? 'Error' : 'Error'));
    }
  };

  return (
    <div className={`${card} rounded-3xl p-5 md:p-6`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>
            {isHinglish ? 'Reminders' : 'Reminders'}
          </div>
          <div className={`mt-2 text-sm font-bold ${tp} flex items-center gap-2`}>
            <AlarmClock size={16} /> {isHinglish ? 'In-app reminders (Supabase)' : 'In-app reminders (Supabase)'}
          </div>
          <div className={`mt-1 text-xs ${ts}`}>
            {isHinglish
              ? 'Cron job reminders ko notifications me convert karta hai (har 1 minute).'
              : 'A cron job converts due reminders into Notifications (every 1 minute).'}
          </div>
        </div>

        <button
          onClick={() => void refresh()}
          disabled={!enabled || loading}
          className={`px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2 ${btnSoft} ${(!enabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={!enabled ? (isHinglish ? 'Login required' : 'Login required') : ''}
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          {isHinglish ? 'Refresh' : 'Refresh'}
        </button>
      </div>

      {!enabled ? (
        <div className={`mt-4 text-sm ${ts}`}>
          {isHinglish ? 'Login karke aao — tab reminders use kar paoge.' : 'Sign in to create reminders.'}
        </div>
      ) : null}

      {/* Create */}
      <div className={`mt-5 rounded-2xl p-4 ${btnSoft}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>
              {isHinglish ? 'Target' : 'Target'}
            </div>

            <div className="mt-2 flex gap-2 flex-wrap">
              <button
                onClick={() => { setEntityType('task'); setEntityId(''); }}
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${entityType === 'task'
                  ? `${btnPrimary} text-white`
                  : isDark ? 'bg-white/[0.02] border border-white/[0.06] text-slate-400' : 'bg-white border border-slate-200/60 text-slate-600'
                  }`}
              >
                {lang === 'pro' ? 'Task' : (isHinglish ? 'Quest' : 'Quest')}
              </button>
              <button
                onClick={() => { setEntityType('note'); setEntityId(''); }}
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold transition-all ${entityType === 'note'
                  ? `${btnPrimary} text-white`
                  : isDark ? 'bg-white/[0.02] border border-white/[0.06] text-slate-400' : 'bg-white border border-slate-200/60 text-slate-600'
                  }`}
              >
                {isHinglish ? 'Note' : 'Note'}
              </button>
            </div>

            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className={`mt-3 w-full px-3 py-2 rounded-xl text-[13px] outline-none ${darkLike
                ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                : 'bg-white/70 border border-slate-200/60 text-slate-900'
                }`}
            >
              <option value="">{isHinglish ? 'Select…' : 'Select…'}</option>
              {entityOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>

            <div className={`mt-3 text-[11px] ${ts}`}>
              {isHinglish ? 'Optional title (notification me dikhega)' : 'Optional title (shown in notification)'}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isHinglish ? 'eg: Important: Submit assignment' : 'e.g., Important: Submit assignment'}
              className={`mt-1 w-full px-3 py-2 rounded-xl text-[13px] outline-none ${darkLike
                ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                : 'bg-white/70 border border-slate-200/60 text-slate-900'
                }`}
            />
          </div>

          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>
              {isHinglish ? 'When' : 'When'}
            </div>

            <div className="mt-2 flex gap-2 flex-wrap">
              <button onClick={() => quickSet('10m')} className={`px-3 py-2 rounded-xl text-[12px] font-semibold ${btnSoft}`}>+10m</button>
              <button onClick={() => quickSet('1h')} className={`px-3 py-2 rounded-xl text-[12px] font-semibold ${btnSoft}`}>+1h</button>
              <button onClick={() => quickSet('tomorrow9')} className={`px-3 py-2 rounded-xl text-[12px] font-semibold ${btnSoft}`}>{isHinglish ? 'Kal 9AM' : 'Tomorrow 9AM'}</button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <CalendarClock size={16} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
              <input
                type="datetime-local"
                value={whenLocal}
                onChange={(e) => setWhenLocal(e.target.value)}
                className={`flex-1 px-3 py-2 rounded-xl text-[13px] outline-none ${darkLike
                  ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                  : 'bg-white/70 border border-slate-200/60 text-slate-900'
                  }`}
              />
            </div>

            <button
              onClick={() => void create()}
              className={`mt-4 w-full px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all ${btnPrimary}`}
            >
              {isHinglish ? 'Set Reminder' : 'Set Reminder'}
            </button>

            {(msg || error) ? (
              <div className={`mt-3 text-[12px] ${String(msg || error).toLowerCase().includes('error') ? 'text-[tomato]' : (darkLike ? 'text-amber-200' : 'text-slate-800')}`}>
                {msg || error}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Upcoming */}
      <div className="mt-5">
        <div className={`text-[12px] font-black ${tp}`}>{isHinglish ? 'Upcoming' : 'Upcoming'}</div>
        {upcoming.length === 0 ? (
          <div className={`mt-2 text-[12px] ${ts}`}>{isHinglish ? 'Koi pending reminder nahi.' : 'No pending reminders.'}</div>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.slice(0, 20).map((r) => (
              <div key={r.id} className={`rounded-2xl p-3 flex items-start justify-between gap-3 ${btnSoft}`}>
                <div className="min-w-0">
                  <div className={`text-[13px] font-semibold ${tp} truncate`}>{r.title || (r.entity_type === 'task' ? 'Quest Reminder' : 'Note Reminder')}</div>
                  <div className={`mt-1 text-[11px] ${ts}`}>⏰ {formatLocal(r.remind_at)}</div>
                  <div className={`mt-0.5 text-[11px] ${ts}`}>Target: {r.entity_type} · {r.entity_id}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => void cancelReminder(r.id)}
                    className={`p-2 rounded-xl ${btnSoft}`}
                    title={isHinglish ? 'Cancel' : 'Cancel'}
                  >
                    <XCircle size={16} className={ts} />
                  </button>
                  <button
                    onClick={() => void deleteReminder(r.id)}
                    className={`p-2 rounded-xl ${btnSoft}`}
                    title={isHinglish ? 'Delete' : 'Delete'}
                  >
                    <Trash2 size={16} className={ts} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="mt-6">
        <div className={`text-[12px] font-black ${tp}`}>{isHinglish ? 'History' : 'History'}</div>
        {history.length === 0 ? (
          <div className={`mt-2 text-[12px] ${ts}`}>{isHinglish ? 'Abhi tak kuch nahi.' : 'Nothing yet.'}</div>
        ) : (
          <div className="mt-3 space-y-2">
            {history.slice(0, 10).map((r) => (
              <div key={r.id} className={`rounded-2xl p-3 flex items-start justify-between gap-3 ${btnSoft}`}>
                <div className="min-w-0">
                  <div className={`text-[13px] font-semibold ${tp} truncate`}>{r.title || (r.entity_type === 'task' ? 'Quest Reminder' : 'Note Reminder')}</div>
                  <div className={`mt-1 text-[11px] ${ts}`}>⏰ {formatLocal(r.remind_at)}</div>
                  <div className={`mt-0.5 text-[11px] ${ts}`}>Status: {r.status}{r.sent_at ? ` · sent ${formatLocal(r.sent_at)}` : ''}</div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {r.status === 'sent' ? (
                    <CheckCircle2 size={18} className={isHinglish ? 'text-indigo-500' : isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                  ) : null}
                  <button
                    onClick={() => void deleteReminder(r.id)}
                    className={`p-2 rounded-xl ${btnSoft}`}
                    title={isHinglish ? 'Delete' : 'Delete'}
                  >
                    <Trash2 size={16} className={ts} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
