import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { weekStartISO } from '../utils/recurrence';

type ProfileHit = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
};

type LeaderRow = {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  is_you: boolean;
};

type IncomingRequest = {
  other_id: string;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  requested_at: string;
};

function Avatar({
  url,
  name,
  shellCls,
  textCls,
}: {
  url: string | null;
  name: string;
  shellCls: string;
  textCls: string;
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? '?';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <div className={`h-9 w-9 shrink-0 rounded-full overflow-hidden flex items-center justify-center ${shellCls}`}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : <span className={`text-xs font-semibold ${textCls}`}>{initials}</span>}
    </div>
  );
}

export default function FriendsLeaderboard() {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const isPro = lang === 'pro';

  const [tab, setTab] = useState<'leaderboard' | 'requests'>('leaderboard');
  const [weekStart, setWeekStart] = useState<string>(weekStartISO());
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ProfileHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);

  // ── Theme classes ───────────────────────────────────────────────────────
  const shell = isModern
    ? 'rounded-2xl bg-[var(--kq-surface)] border border-[var(--kq-border)] shadow-sm p-4 sm:p-6'
    : isHinglish
      ? 'rounded-2xl bg-white/70 border border-indigo-200/30 shadow-sm p-4 sm:p-6'
      : isDark
        ? 'rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-sm p-4 sm:p-6'
        : 'rounded-2xl bg-white/80 border border-slate-200/50 shadow-sm p-4 sm:p-6';

  const tp = isModern ? 'text-[var(--kq-text-primary)]' : isDark ? 'text-slate-100' : 'text-slate-900';
  const ts = isModern ? 'text-[var(--kq-text-secondary)]' : isDark ? 'text-slate-400' : 'text-slate-500';

  const chipOn = isModern
    ? 'bg-[var(--kq-primary-soft)] border border-[var(--kq-border2)] text-[var(--kq-text-primary)]'
    : isHinglish
      ? 'bg-indigo-500/10 border border-indigo-200/40 text-indigo-700'
      : isDark
        ? 'bg-white/[0.04] border border-white/[0.08] text-slate-100'
        : 'bg-indigo-50 border border-indigo-200/60 text-indigo-700';

  const chipOff = isModern
    ? 'bg-transparent border border-[var(--kq-border)] text-[var(--kq-text-secondary)] hover:bg-[var(--kq-primary-soft)]'
    : isHinglish
      ? 'bg-transparent border border-indigo-200/30 text-slate-700 hover:bg-white/60'
      : isDark
        ? 'bg-transparent border border-white/[0.08] text-slate-300 hover:bg-white/[0.05]'
        : 'bg-transparent border border-slate-200/70 text-slate-600 hover:bg-slate-900/5';

  const inputCls = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)] text-[var(--kq-text-primary)] placeholder:text-[var(--kq-text-muted)] focus:outline-none focus:border-[var(--kq-border2)]'
    : isHinglish
      ? 'bg-white/70 border border-indigo-200/30 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300'
      : isDark
        ? 'bg-white/[0.03] border border-white/[0.06] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-white/[0.16]'
        : 'bg-white/70 border border-slate-200/60 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300';

  const listShell = isModern
    ? 'rounded-xl bg-[var(--kq-surface)] border border-[var(--kq-border)] overflow-hidden'
    : isDark
      ? 'rounded-xl bg-black/30 border border-white/[0.08] overflow-hidden'
      : 'rounded-xl bg-white/70 border border-slate-200/60 overflow-hidden';

  const rowHover = isModern ? 'hover:bg-[var(--kq-primary-soft)]' : isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-black/[0.03]';

  const avatarShell = isModern
    ? 'bg-[var(--kq-primary-soft)] border border-[var(--kq-border)]'
    : isDark
      ? 'bg-white/[0.06] border border-white/[0.08]'
      : isHinglish
        ? 'bg-white/70 border border-indigo-200/30'
        : 'bg-slate-100 border border-slate-200/70';

  const avatarText = isModern ? 'text-[var(--kq-text-primary)]' : isDark ? 'text-white/80' : 'text-slate-700';

  const xpLabel = isPro || isHinglish ? 'XP' : 'Punya';

  async function loadLeaderboard() {
    setLoadingBoard(true);
    setMsg('');
    try {
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', { p_week_start: weekStart });
      if (error) throw error;
      setRows((data ?? []) as LeaderRow[]);
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to load leaderboard');
    } finally {
      setLoadingBoard(false);
    }
  }

  async function loadRequests() {
    setLoadingReq(true);
    setMsg('');
    try {
      const { data, error } = await supabase.rpc('list_incoming_friend_requests');
      if (error) throw error;
      setRequests((data ?? []) as IncomingRequest[]);
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to load requests');
    } finally {
      setLoadingReq(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    if (tab === 'requests') loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        setHits([]);
        return;
      }
      setSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_profiles', { p_q: term, p_limit: 10 });
        if (error) throw error;
        setHits((data ?? []) as ProfileHit[]);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function requestFriend(username: string) {
    setMsg('');
    try {
      const { data, error } = await supabase.rpc('request_friend', { p_username: username });
      if (error) throw error;
      const status = (data?.[0]?.status ?? 'pending') as string;
      setMsg(status === 'accepted' ? `✅ You and @${username} are now friends.` : `📩 Request sent to @${username}.`);
      setQ('');
      setHits([]);
      await loadLeaderboard();
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed to request friend');
    }
  }

  async function respond(otherId: string, action: 'accept' | 'decline' | 'block') {
    setMsg('');
    try {
      const { error } = await supabase.rpc('respond_friend_request', { p_other: otherId, p_action: action });
      if (error) throw error;
      await loadRequests();
      await loadLeaderboard();
      setMsg(action === 'accept' ? '✅ Friend request accepted.' : action === 'decline' ? '✅ Request declined.' : '✅ User blocked.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Failed');
    }
  }

  return (
    <div className="w-full">
      <div className={shell}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`text-lg sm:text-xl font-black ${tp}`}>{isPro ? 'Friends' : 'Friends'}</div>
            <div className={`text-xs sm:text-sm mt-0.5 ${ts}`}>
              {isPro ? 'Add friends by username and compare weekly XP.' : 'Add friends by username and compare weekly Punya.'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTab('leaderboard')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${tab === 'leaderboard' ? chipOn : chipOff}`}>
              Leaderboard
            </button>
            <button onClick={() => setTab('requests')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${tab === 'requests' ? chipOn : chipOff}`}>
              Requests
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isPro ? 'Add a friend by username (e.g., gaurav)' : 'Add friend by username (e.g. gaurav)'}
                className={`w-full rounded-xl px-3 py-2 text-sm ${inputCls}`}
              />
              <div className={`absolute right-2 top-2 text-xs ${ts}`}>{searching ? (isPro ? 'Searching…' : 'Searching…') : ''}</div>
            </div>

            {!!hits.length && (
              <div className={`mt-2 ${listShell}`}>
                {hits.map((h) => (
                  <button key={h.user_id} onClick={() => requestFriend(h.username)} className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-all ${rowHover}`}>
                    <Avatar url={h.avatar_url} name={h.display_name ?? h.username} shellCls={avatarShell} textCls={avatarText} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${tp} truncate`}>@{h.username}</div>
                      <div className={`text-xs ${ts} truncate`}>{h.display_name ?? ''}</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-md ${chipOn}`}>Add</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={`text-xs ${ts}`}>Week starting (Mon)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={`mt-1 w-full rounded-xl px-3 py-2 text-sm ${inputCls}`} />
          </div>
        </div>

        {msg ? <div className={`mt-3 text-sm rounded-xl px-3 py-2 ${listShell} ${tp}`}>{msg}</div> : null}

        {tab === 'leaderboard' ? (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-bold ${tp}`}>Weekly leaderboard</div>
              <button onClick={loadLeaderboard} className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${tab === 'leaderboard' ? chipOn : chipOff}`}>
                {loadingBoard ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <div className={`mt-3 rounded-2xl overflow-hidden ${isModern ? 'border border-[var(--kq-border)]' : isDark ? 'border border-white/[0.08]' : 'border border-slate-200/70'}`}>
              <div className={`grid grid-cols-[48px_1fr_96px] sm:grid-cols-[56px_1fr_120px] px-3 py-2 text-xs ${ts} ${isModern ? 'bg-[var(--kq-primary-soft)]' : isDark ? 'bg-white/[0.03]' : 'bg-slate-900/5'}`}>
                <div>Rank</div>
                <div>Person</div>
                <div className="text-right">{xpLabel}</div>
              </div>

              {rows.map((r) => (
                <div key={r.user_id} className={`grid grid-cols-[48px_1fr_96px] sm:grid-cols-[56px_1fr_120px] items-center px-3 py-2 text-sm ${rowHover} ${r.is_you ? (isModern ? 'bg-[var(--kq-primary-soft)]' : isDark ? 'bg-white/[0.03]' : 'bg-indigo-50') : ''}`}>
                  <div className={`text-xs font-semibold ${ts}`}>#{r.rank}</div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar url={r.avatar_url} name={r.display_name ?? r.username} shellCls={avatarShell} textCls={avatarText} />
                    <div className="min-w-0">
                      <div className={`font-semibold ${tp} truncate`}>{r.display_name || r.username}</div>
                      <div className={`text-xs ${ts} truncate`}>@{r.username}{r.is_you ? (isPro ? ' · you' : ' · you') : ''}</div>
                    </div>
                  </div>
                  <div className={`text-right font-semibold ${tp}`}>{r.xp}</div>
                </div>
              ))}

              {!loadingBoard && rows.length === 0 ? (
                <div className={`px-3 py-3 text-sm ${ts}`}>No data yet.</div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-bold ${tp}`}>Incoming requests</div>
              <button onClick={loadRequests} className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${chipOff}`}>
                {loadingReq ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            <div className={`mt-3 rounded-2xl overflow-hidden ${isModern ? 'border border-[var(--kq-border)]' : isDark ? 'border border-white/[0.08]' : 'border border-slate-200/70'}`}>
              {requests.map((r) => (
                <div key={r.other_id} className={`px-3 py-3 flex items-center gap-3 ${rowHover}`}>
                  <Avatar url={r.other_avatar_url} name={r.other_display_name ?? r.other_username} shellCls={avatarShell} textCls={avatarText} />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${tp} truncate`}>{r.other_display_name ?? r.other_username}</div>
                    <div className={`text-xs ${ts} truncate`}>@{r.other_username}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => respond(r.other_id, 'accept')} className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${chipOn}`}>Accept</button>
                    <button onClick={() => respond(r.other_id, 'decline')} className={`text-xs px-2.5 py-1.5 rounded-lg transition-all ${chipOff}`}>Decline</button>
                  </div>
                </div>
              ))}
              {!loadingReq && requests.length === 0 ? <div className={`px-3 py-3 text-sm ${ts}`}>No requests.</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
