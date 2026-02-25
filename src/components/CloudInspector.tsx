import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Copy, RefreshCcw, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

type TaskRow = {
  id: string;
  user_id: string;
  quest_id?: string;
  title: string;
  done: boolean;
  created_at: string;
};

type UserStateRow = {
  user_id: string;
  app_key: string;
  version: string;
  snapshot: unknown;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export function CloudInspector({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isDark, isHinglish } = useTheme();

  const [tab, setTab] = useState<'user_state' | 'tasks' | 'attachments'>('user_state');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [states, setStates] = useState<UserStateRow[]>([]);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tasksSchemaHint, setTasksSchemaHint] = useState<string | null>(null);
  const [attachmentsSchemaHint, setAttachmentsSchemaHint] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const snapshotQuestCount = useMemo(() => {
    const latest = states[0]?.snapshot as any;
    const list =
      (latest && Array.isArray(latest.quests) && latest.quests) ||
      (latest?.state && Array.isArray(latest.state.quests) && latest.state.quests) ||
      null;
    return Array.isArray(list) ? list.length : 0;
  }, [states]);

  const darkLike = isDark || isHinglish;

  const card = useMemo(() => {
    return darkLike
      ? 'bg-[#0C0C1A]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl'
      : 'bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-2xl';
  }, [darkLike]);

  const tp = darkLike ? 'text-slate-100' : 'text-slate-900';
  const ts = darkLike ? 'text-slate-400' : 'text-slate-500';
  const btnSoft = darkLike
    ? 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06]'
    : 'bg-white/80 border border-slate-200/70 hover:bg-white';

  async function refresh() {
    setLoading(true);
    setError(null);
    setTasksSchemaHint(null);
    setAttachmentsSchemaHint(null);

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) {
        setError(isHinglish ? 'Login nahi hai. Pehle sign in karo.' : 'Not signed in. Please sign in first.');
        setTasks([]);
        setStates([]);
        setAttachments([]);
        return;
      }

      const stateRes = await supabase
        .from('user_state')
        .select('user_id,app_key,version,snapshot,created_at,updated_at')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (stateRes.error) throw stateRes.error;
      setStates((stateRes.data as UserStateRow[]) ?? []);

      // Prefer newer schema (quest_id). Fall back if column isn't there.
      const tasksResNew = await supabase
        .from('tasks')
        .select('id,user_id,quest_id,title,done,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(200);

      if (tasksResNew.error) {
        const msg = tasksResNew.error.message.toLowerCase();
        if (msg.includes('quest_id') && msg.includes('does not exist')) {
          setTasksSchemaHint(
            'Your tasks table is missing column "quest_id". Run the Phase 2 SQL patch to enable automatic syncing from Quests → tasks table.',
          );
          const tasksResOld = await supabase
            .from('tasks')
            .select('id,user_id,title,done,created_at')
            .eq('user_id', uid)
            .order('created_at', { ascending: false })
            .limit(200);
          if (tasksResOld.error) throw tasksResOld.error;
          setTasks((tasksResOld.data as TaskRow[]) ?? []);
        } else {
          throw tasksResNew.error;
        }
      } else {
        setTasks((tasksResNew.data as TaskRow[]) ?? []);
      }

      // Attachments (Phase 8)
      const attRes = await supabase
        .from('attachments')
        .select('id,user_id,entity_type,entity_id,file_name,storage_path,mime_type,size_bytes,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(200);

      if (attRes.error) {
        const msg = attRes.error.message.toLowerCase();
        if (msg.includes('relation') && msg.includes('attachments') && msg.includes('does not exist')) {
          setAttachmentsSchemaHint('Attachments table not found. Run the Phase 8 SQL patch (phase8_attachments.sql).');
          setAttachments([]);
        } else {
          throw attRes.error;
        }
      } else {
        setAttachments((attRes.data as AttachmentRow[]) ?? []);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function copySnapshot(key: string, snapshot: unknown) {
    try {
      const raw = JSON.stringify(snapshot, null, 2);
      await navigator.clipboard.writeText(raw);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1200);
    } catch {
      // ignore
    }
  }

  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        role="button"
        tabIndex={0}
        aria-label="Close inspector"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-4xl rounded-3xl ${card} overflow-hidden`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 md:p-6 border-b border-white/[0.06]">
          <div>
            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>
              {isHinglish ? 'Developer' : 'Developer'}
            </div>
            <h3 className={`mt-1 text-lg md:text-xl font-black ${tp}`}>
              {isHinglish ? 'Cloud Inspector (Supabase)' : 'Cloud Inspector (Supabase)'}
            </h3>
            <p className={`mt-1 text-[12px] ${ts}`}>
              {isHinglish
                ? 'RLS ki wajah se yahan sirf tumhara data dikhega.'
                : 'Because of RLS, you will only see your own rows here.'}
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
            <button onClick={onClose} className={`p-2 rounded-xl ${btnSoft}`} aria-label="Close">
              <X size={18} className={ts} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 md:px-6 pt-4">
          <div className={`inline-flex rounded-2xl p-1 ${btnSoft}`}>
            <button
              onClick={() => setTab('user_state')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${tab === 'user_state'
                  ? isHinglish
                    ? 'bg-indigo-500 text-white'
                    : isDark
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-600 text-white'
                  : ts
                }`}
            >
              user_state ({states.length})
            </button>
            <button
              onClick={() => setTab('tasks')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${tab === 'tasks'
                  ? isHinglish
                    ? 'bg-indigo-500 text-white'
                    : isDark
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-600 text-white'
                  : ts
                }`}
            >
              tasks ({tasks.length})
            </button>
            <button
              onClick={() => setTab('attachments')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${tab === 'attachments'
                  ? isHinglish
                    ? 'bg-indigo-500 text-white'
                    : isDark
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-600 text-white'
                  : ts
                }`}
            >
              attachments ({attachments.length})
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 md:px-6 pb-5 md:pb-6 pt-4 max-h-[70vh] overflow-y-auto">
          {error ? (
            <div className={`rounded-2xl p-4 flex items-start gap-3 ${btnSoft}`}>
              <AlertTriangle size={18} className="text-[tomato] shrink-0 mt-0.5" />
              <div>
                <div className={`text-[13px] font-bold ${tp}`}>{isHinglish ? 'Error' : 'Error'}</div>
                <div className={`text-[12px] mt-1 ${ts}`}>{error}</div>
              </div>
            </div>
          ) : null}

          {!error && tab === 'tasks' && (
            <div className={`rounded-2xl overflow-hidden ${btnSoft}`}>
              <div className={`px-4 py-3 text-[12px] font-semibold ${tp} border-b border-white/[0.06]`}>
                {isHinglish ? 'Tasks table rows' : 'Tasks table rows'}
              </div>

              <div className={`px-4 pt-3 text-[12px] ${ts}`}>
                {isHinglish
                  ? `Note: App ka main data user_state me save hota hai. Snapshot quests: ${snapshotQuestCount}.`
                  : `Note: Your app's main data is saved in user_state (snapshot). Snapshot quests: ${snapshotQuestCount}.`}
              </div>

              {tasksSchemaHint ? (
                <div className={`px-4 pt-2 pb-3 text-[12px] ${ts}`}>
                  <span className="font-semibold">Fix:</span> {tasksSchemaHint}
                </div>
              ) : null}

              <div className="divide-y divide-white/[0.06]">
                {tasks.length === 0 ? (
                  <div className={`px-4 py-4 text-[12px] ${ts}`}>
                    {isHinglish
                      ? 'No rows found. (Normal if tasks sync is not enabled yet)'
                      : 'No rows found. (Normal if tasks sync is not enabled yet)'}
                  </div>
                ) : (
                  tasks.map((t) => (
                    <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="text-lg">{t.done ? '✅' : '⬜'}</span>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] font-semibold ${tp} truncate`}>{t.title}</div>
                        <div className={`text-[11px] ${ts}`}>{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                      <div className={`text-[10px] ${ts} shrink-0 hidden sm:block`}>
                        {t.quest_id ? `qid:${String(t.quest_id).slice(0, 8)}…` : `${t.id.slice(0, 8)}…`}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!error && tab === 'attachments' && (
            <div className={`rounded-2xl overflow-hidden ${btnSoft}`}>
              <div className={`px-4 py-3 text-[12px] font-semibold ${tp} border-b border-white/[0.06]`}>
                {isHinglish ? 'Attachments table rows' : 'Attachments table rows'}
              </div>

              {attachmentsSchemaHint ? (
                <div className={`px-4 pt-3 pb-2 text-[12px] ${ts}`}>
                  <span className="font-semibold">Fix:</span> {attachmentsSchemaHint}
                </div>
              ) : null}

              <div className="divide-y divide-white/[0.06]">
                {attachments.length === 0 ? (
                  <div className={`px-4 py-4 text-[12px] ${ts}`}>{isHinglish ? 'No rows found.' : 'No rows found.'}</div>
                ) : (
                  attachments.map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] font-semibold ${tp} truncate`}>{a.file_name}</div>
                        <div className={`text-[11px] ${ts}`}>
                          {new Date(a.created_at).toLocaleString()} • {a.entity_type}:{String(a.entity_id).slice(0, 8)}…
                        </div>
                        <div className={`text-[10px] ${ts} truncate`}>{a.storage_path}</div>
                      </div>
                      <div className={`text-[11px] ${ts} shrink-0 hidden sm:block`}>
                        {a.size_bytes ? `${Math.round(a.size_bytes / 1024)} KB` : ''}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {!error && tab === 'user_state' && (
            <div className="space-y-3">
              {states.length === 0 ? (
                <div className={`rounded-2xl p-4 text-[12px] ${ts} ${btnSoft}`}>
                  {isHinglish
                    ? 'No rows found. App me kuch change karke Refresh karo.'
                    : 'No rows found. Change something in the app, then Refresh.'}
                </div>
              ) : (
                states.map((s) => {
                  const key = `${s.user_id}:${s.app_key}`;
                  const openRow = expandedKey === key;
                  const snapshotStr = (() => {
                    try {
                      return JSON.stringify(s.snapshot, null, 2);
                    } catch {
                      return String(s.snapshot);
                    }
                  })();

                  const preview = snapshotStr.length > 900 ? `${snapshotStr.slice(0, 900)}\n…` : snapshotStr;

                  return (
                    <div key={key} className={`rounded-2xl overflow-hidden ${btnSoft}`}>
                      <button
                        onClick={() => setExpandedKey(openRow ? null : key)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                      >
                        <div className="min-w-0">
                          <div className={`text-[13px] font-black ${tp} truncate`}>
                            {s.app_key} <span className={`text-[11px] font-semibold ${ts}`}>v{s.version}</span>
                          </div>
                          <div className={`text-[11px] ${ts}`}>updated: {new Date(s.updated_at).toLocaleString()}</div>
                        </div>
                        <div className={`text-[11px] ${ts} shrink-0`}>
                          {openRow ? (isHinglish ? 'Hide' : 'Hide') : (isHinglish ? 'View' : 'View')}
                        </div>
                      </button>

                      {openRow && (
                        <div className="px-4 pb-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>snapshot (JSON)</div>
                            <button
                              onClick={() => void copySnapshot(key, s.snapshot)}
                              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${btnSoft}`}
                            >
                              {copiedKey === key ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                              {copiedKey === key
                                ? isHinglish
                                  ? 'Copied'
                                  : 'Copied'
                                : isHinglish
                                  ? 'Copy'
                                  : 'Copy'}
                            </button>
                          </div>

                          <pre
                            className={`text-[11px] leading-relaxed rounded-2xl p-3 overflow-auto max-h-[380px] ${isDark ? 'bg-black/40 text-slate-200' : 'bg-black/[0.03] text-slate-800'
                              }`}
                          >
                            {preview}
                          </pre>

                          {snapshotStr.length > 900 ? (
                            <div className={`mt-2 text-[11px] ${ts}`}>
                              {isHinglish
                                ? 'Preview dikh raha hai. Full JSON copy button se milega.'
                                : 'You’re seeing a preview. Use Copy to get the full JSON.'}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
