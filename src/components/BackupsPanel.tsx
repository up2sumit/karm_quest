import { useMemo, useState } from 'react';
import { AlertTriangle, Trash2, Plus, RefreshCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseBackups } from '../hooks/useSupabaseBackups';

export function BackupsPanel(props: {
  enabled: boolean;
  userId: string | null;
  appKey: string;
  /** Called after we have fetched a backup snapshot. */
  onApplySnapshot?: (snapshot: unknown) => void;
}) {
  const { isDark, isHinglish } = useTheme();
  const { enabled, userId, appKey, onApplySnapshot } = props;

  const backups = useSupabaseBackups({ enabled, userId, appKey, limit: 20 });

  const [label, setLabel] = useState('');
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const card = useMemo(() => {
    return isHinglish
      ? 'bg-white/70 backdrop-blur-xl border border-rose-200/20 shadow-sm'
      : isDark
        ? 'bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-sm'
        : 'bg-white/80 backdrop-blur-xl border border-slate-200/50 shadow-sm';
  }, [isDark, isHinglish]);

  const tp = isHinglish ? 'text-slate-900' : isDark ? 'text-slate-100' : 'text-slate-900';
  const ts = isHinglish ? 'text-slate-500' : isDark ? 'text-slate-400' : 'text-slate-500';
  const btnSoft = isHinglish
    ? 'bg-white/70 border border-rose-200/30 hover:bg-white'
    : isDark
      ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
      : 'bg-white/70 border border-slate-200/60 hover:bg-white';

  async function onCreate() {
    const res = await backups.createBackup(label.trim());
    if (res.ok) {
      setLabel('');
      setToast(isHinglish ? 'Backup ban gaya ✅' : 'Backup created ✅');
      setTimeout(() => setToast(null), 1400);
    }
  }

  async function doRestore(id: string) {
    // 1) Fetch snapshot so we can apply instantly in UI
    const snap = await backups.fetchBackupSnapshot(id);
    if (snap.ok) {
      onApplySnapshot?.(snap.backup.snapshot);
    }

    // 2) Persist restore on server (updates user_state)
    const res = await backups.restoreBackup(id);
    if (res.ok) {
      setToast(isHinglish ? 'Restore complete ✅' : 'Restore complete ✅');
      setTimeout(() => setToast(null), 1400);
    }
  }

  async function doDelete(id: string) {
    const res = await backups.deleteBackup(id);
    if (res.ok) {
      setToast(isHinglish ? 'Deleted ✅' : 'Deleted ✅');
      setTimeout(() => setToast(null), 1200);
    }
  }

  return (
    <div className={`${card} rounded-3xl p-5 md:p-6`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>{isHinglish ? 'Backups' : 'Backups'}</div>
          <div className={`mt-2 text-sm font-bold ${tp} flex items-center gap-2`}>
            <RefreshCcw size={16} /> {isHinglish ? 'Cloud restore points' : 'Cloud restore points'}
          </div>
          <div className={`mt-1 text-xs ${ts}`}>
            {isHinglish
              ? 'Agar kuch galat ho jaye, yahan se purana state wapas la sakte ho.'
              : 'Create restore points so you can roll back if anything goes wrong.'}
          </div>
        </div>

        <button
          onClick={() => void backups.refresh()}
          className={`px-4 py-2 rounded-xl text-[13px] font-semibold shadow-sm hover:shadow transition-all ${btnSoft}`}
          disabled={!enabled || backups.loading}
        >
          <span className="inline-flex items-center gap-2">
            <RefreshCcw size={16} className={backups.loading ? 'animate-spin' : ''} />
            {isHinglish ? 'Refresh' : 'Refresh'}
          </span>
        </button>
      </div>

      {!enabled ? (
        <div className={`mt-4 text-xs ${ts} flex items-center gap-2`}>
          <AlertTriangle size={14} className="text-[tomato]" />
          {isHinglish ? 'Backups ke liye login chahiye.' : 'Sign in required for backups.'}
        </div>
      ) : null}

      {backups.error ? <div className="mt-3 text-xs text-[tomato]">{backups.error}</div> : null}
      {toast ? <div className={`mt-3 text-xs ${isHinglish ? 'text-rose-700' : isDark ? 'text-amber-200' : 'text-slate-800'}`}>{toast}</div> : null}

      {/* Create */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={isHinglish ? 'Label (optional): before major changes' : 'Label (optional): before major changes'}
          className={`px-3 py-2 rounded-xl text-[13px] outline-none flex-1 min-w-[220px] ${
            isHinglish
              ? 'bg-white/70 border border-rose-200/30 text-slate-900'
              : isDark
                ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100'
                : 'bg-white/70 border border-slate-200/60 text-slate-900'
          }`}
          disabled={!enabled || backups.creating}
        />
        <button
          onClick={() => void onCreate()}
          disabled={!enabled || backups.creating}
          className={`px-4 py-2 rounded-xl text-white text-[13px] font-semibold shadow-md hover:shadow-lg hover:scale-[1.01] transition-all ${
            isHinglish ? 'bg-gradient-to-r from-rose-500 to-violet-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'
          } ${!enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> {isHinglish ? 'Create backup' : 'Create backup'}
          </span>
        </button>
      </div>

      {/* List */}
      <div className={`mt-4 rounded-2xl overflow-hidden ${btnSoft}`}>
        <div className={`px-4 py-3 text-[12px] font-semibold ${tp} border-b border-white/[0.06]`}>
          {isHinglish ? `Recent backups (${backups.items.length})` : `Recent backups (${backups.items.length})`}
        </div>

        {backups.items.length === 0 ? (
          <div className={`px-4 py-4 text-[12px] ${ts}`}>
            {isHinglish ? 'Abhi koi backup nahi hai. Pehla backup banao.' : 'No backups yet. Create your first backup.'}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {backups.items.map((b) => {
              const busy = backups.restoring === b.id || backups.deleting === b.id;
              return (
                <div key={b.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-[240px]">
                    <div className={`text-[13px] font-bold ${tp}`}>{b.label || '(no label)'}</div>
                    <div className={`text-[11px] ${ts}`}>v{b.version || '-'} • {new Date(b.created_at).toLocaleString()}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmRestore(b.id)}
                      disabled={!enabled || busy}
                      className={`px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${btnSoft}`}
                      title={isHinglish ? 'Restore this backup' : 'Restore this backup'}
                    >
                      <RefreshCcw size={16} /> {isHinglish ? 'Restore' : 'Restore'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(b.id)}
                      disabled={!enabled || busy}
                      className={`px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 ${
                        isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/15'
                              : 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                      title={isHinglish ? 'Delete backup' : 'Delete backup'}
                    >
                      <Trash2 size={16} /> {isHinglish ? 'Delete' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore confirm */}
      {confirmRestore ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmRestore(null)} />
          <div className={`relative w-full max-w-md rounded-3xl p-6 ${card}`}>
            <h4 className={`text-[15px] font-black ${tp}`}>{isHinglish ? 'Restore backup?' : 'Restore backup?'}</h4>
            <p className={`text-[12px] mt-2 ${ts}`}>
              {isHinglish
                ? 'Current data overwrite ho jayega (quests, notes, shop, etc.).'
                : 'Your current data will be overwritten (quests, notes, shop, etc.).'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmRestore(null)} className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${btnSoft}`}>
                {isHinglish ? 'Cancel' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const id = confirmRestore;
                  setConfirmRestore(null);
                  void doRestore(id);
                }}
                className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white ${isHinglish ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'} transition-all`}
              >
                {isHinglish ? 'Restore' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirm */}
      {confirmDelete ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
          <div className={`relative w-full max-w-md rounded-3xl p-6 ${card}`}>
            <h4 className={`text-[15px] font-black ${tp}`}>{isHinglish ? 'Delete backup?' : 'Delete backup?'}</h4>
            <p className={`text-[12px] mt-2 ${ts}`}>
              {isHinglish ? 'Ye restore point permanently delete ho jayega.' : 'This restore point will be permanently deleted.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className={`px-4 py-2 rounded-xl text-[13px] font-semibold ${btnSoft}`}>
                {isHinglish ? 'Cancel' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const id = confirmDelete;
                  setConfirmDelete(null);
                  void doDelete(id);
                }}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-all"
              >
                {isHinglish ? 'Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
