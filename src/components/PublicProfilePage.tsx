import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { weekStartISO } from '../utils/recurrence';

type PublicProfile = {
  userId?: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  level?: number | null;
  streak?: number | null;
  frameId?: string | null;
  topAchievements?: { title: string; emoji?: string }[];
  weeklyXp?: number | null;
  isPublic?: boolean | null;
};

async function tryRpc<T>(name: string, args: Record<string, any>): Promise<T | null> {
  try {
    const { data, error } = await supabase.rpc(name, args);
    if (error) return null;
    return (data as T) ?? null;
  } catch {
    return null;
  }
}

export function PublicProfilePage({ username }: { username: string }) {
  const { isDark, isHinglish, isModern, lang } = useTheme();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  const weekStart = useMemo(() => weekStartISO(new Date()), []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);

      // 1) Prefer a single RPC (recommended for clean public access)
      const rpc = await tryRpc<any>('get_public_profile', { p_username: username, p_week_start: weekStart });
      if (alive && rpc) {
        const normalized: PublicProfile = {
          userId: rpc.user_id ?? rpc.userId,
          username: rpc.username ?? username,
          displayName: rpc.display_name ?? rpc.displayName ?? null,
          avatarUrl: rpc.avatar_url ?? rpc.avatarUrl ?? null,
          level: typeof rpc.level === 'number' ? rpc.level : null,
          streak: typeof rpc.streak === 'number' ? rpc.streak : null,
          frameId: rpc.equipped_frame ?? rpc.frameId ?? null,
          weeklyXp: typeof rpc.weekly_xp === 'number' ? rpc.weekly_xp : (typeof rpc.weeklyXp === 'number' ? rpc.weeklyXp : null),
          isPublic: rpc.is_public ?? rpc.isPublic ?? true,
          topAchievements: Array.isArray(rpc.top_achievements)
            ? rpc.top_achievements.map((a: any) => ({ title: String(a.title ?? a), emoji: a.emoji ? String(a.emoji) : undefined }))
            : undefined,
        };
        setProfile(normalized);
        setLoading(false);
        return;
      }

      // 2) Fallback: best-effort reads (requires RLS for public profiles)
      try {
        const { data: pRow, error: pErr } = await supabase
          .from('profiles')
          .select('id, user_id, username, display_name, avatar_url, level, streak, is_public')
          .eq('username', username)
          .maybeSingle();

        if (pErr) throw pErr;
        if (!pRow) {
          if (alive) {
            setErr('Profile not found');
            setProfile(null);
            setLoading(false);
          }
          return;
        }

        const userId = (pRow as any).user_id ?? (pRow as any).id;

        // weekly xp (optional rpc names)
        const weeklyXp =
          (await tryRpc<number>('get_weekly_xp', { p_user_id: userId, p_week_start: weekStart })) ??
          (await tryRpc<number>('weekly_xp', { p_user_id: userId, p_week_start: weekStart })) ??
          null;

        // try to infer frame + achievements from user_state snapshot (optional)
        let frameId: string | null = null;
        let topAchievements: { title: string; emoji?: string }[] | undefined;
        try {
          const { data: us } = await supabase
            .from('user_state')
            .select('snapshot')
            .eq('user_id', userId)
            .maybeSingle();
          const snap = (us as any)?.snapshot;
          if (snap && typeof snap === 'object') {
            frameId = (snap as any)?.shop?.equippedFrame ?? null;
            const ach = (snap as any)?.achievements;
            if (Array.isArray(ach)) {
              topAchievements = ach
                .filter((a: any) => a?.unlocked)
                .slice(0, 6)
                .map((a: any) => ({ title: String(a.title ?? a.id ?? 'Achievement'), emoji: a.emoji ? String(a.emoji) : undefined }));
            }
          }
        } catch {
          // ignore
        }

        const normalized: PublicProfile = {
          userId,
          username: (pRow as any).username ?? username,
          displayName: (pRow as any).display_name ?? null,
          avatarUrl: (pRow as any).avatar_url ?? null,
          level: typeof (pRow as any).level === 'number' ? (pRow as any).level : null,
          streak: typeof (pRow as any).streak === 'number' ? (pRow as any).streak : null,
          weeklyXp,
          frameId,
          topAchievements,
          isPublic: (pRow as any).is_public ?? null,
        };

        if (alive) {
          setProfile(normalized);
          setLoading(false);
        }
      } catch (e: any) {
        if (alive) {
          setErr(e?.message ?? 'Failed to load profile');
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [username, weekStart]);

  const card = isModern
    ? 'bg-[var(--kq-surface)] border border-[var(--kq-border)]'
    : isHinglish
      ? 'bg-white/85 border border-indigo-200/40'
      : isDark
        ? 'bg-white/[0.03] border border-white/[0.06]'
        : 'bg-white/70 border border-slate-200/60';

  const tp = isModern
    ? 'text-[var(--kq-text-primary)]'
    : isHinglish
      ? 'text-slate-900'
      : isDark
        ? 'text-white/90'
        : 'text-slate-900';

  const ts = isModern
    ? 'text-[var(--kq-text-secondary)]'
    : isHinglish
      ? 'text-slate-600'
      : isDark
        ? 'text-white/50'
        : 'text-slate-500';

  const pill = isModern
    ? 'bg-[var(--kq-bg2)] text-[var(--kq-text-primary)] border border-[var(--kq-border)]'
    : isHinglish
      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
      : isDark
        ? 'bg-white/[0.04] text-white/80 border border-white/[0.06]'
        : 'bg-white text-slate-700 border border-slate-200/60';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-xs ${ts}`}>Public Karma Profile</div>
          <h1 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${tp}`}>@{username}</h1>
        </div>
        <button
          onClick={() => {
            try {
              navigator.clipboard.writeText(window.location.href);
            } catch {
              // ignore
            }
          }}
          className={`${pill} px-3 py-2 rounded-xl text-xs font-semibold`}
        >
          Copy link
        </button>
      </div>

      <div className={`${card} rounded-3xl p-5 md:p-6 mt-5`}>
        {loading ? (
          <div className={`text-sm ${ts}`}>Loading…</div>
        ) : err ? (
          <div>
            <div className={`text-sm font-semibold ${tp}`}>{err}</div>
            <div className={`mt-1 text-xs ${ts}`}>
              If this profile should be public, ensure Supabase has either a <code className="px-1">get_public_profile</code> RPC or public RLS for <code className="px-1">profiles</code>.
            </div>
          </div>
        ) : !profile ? (
          <div className={`text-sm ${ts}`}>Not found.</div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center ${pill}`}>
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{isModern ? '🗒️' : (isHinglish ? '🎉' : '🪔')}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className={`text-base font-bold ${tp} truncate`}>{profile.displayName || `@${profile.username}`}</div>
                <div className={`text-xs ${ts} mt-0.5`}>
                  {profile.frameId ? `Frame: ${profile.frameId}` : 'Frame: —'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`${pill} rounded-2xl p-3`}>
                <div className={`text-[10px] uppercase tracking-wide ${ts}`}>Level</div>
                <div className={`mt-1 text-lg font-extrabold ${tp}`}>{profile.level ?? '—'}</div>
              </div>
              <div className={`${pill} rounded-2xl p-3`}>
                <div className={`text-[10px] uppercase tracking-wide ${ts}`}>Streak</div>
                <div className={`mt-1 text-lg font-extrabold ${tp}`}>{profile.streak ?? '—'}</div>
              </div>
              <div className={`${pill} rounded-2xl p-3`}>
                <div className={`text-[10px] uppercase tracking-wide ${ts}`}>Weekly Karma</div>
                <div className={`mt-1 text-lg font-extrabold ${tp}`}>{profile.weeklyXp ?? '—'}</div>
              </div>
              <div className={`${pill} rounded-2xl p-3`}>
                <div className={`text-[10px] uppercase tracking-wide ${ts}`}>Week starts</div>
                <div className={`mt-1 text-sm font-bold ${tp}`}>{weekStart}</div>
              </div>
            </div>

            <div>
              <div className={`text-[11px] font-semibold uppercase tracking-wide ${ts}`}>Top achievements</div>
              {profile.topAchievements && profile.topAchievements.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.topAchievements.slice(0, 8).map((a, idx) => (
                    <div key={idx} className={`${pill} rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1`}>
                      <span>{a.emoji ?? '🏆'}</span>
                      <span className="truncate max-w-[180px]">{a.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`mt-2 text-sm ${ts}`}>—</div>
              )}
            </div>

            <div className={`text-xs ${ts}`}>
              {isHinglish
                ? 'Ye profile read-only hai. App ke andar jaake hi changes kar sakte ho.'
                : (lang === 'pro'
                  ? 'This profile is read-only.'
                  : 'This profile is read-only.')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
