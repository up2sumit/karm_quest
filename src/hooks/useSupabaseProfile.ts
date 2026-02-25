import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeMode } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

export type UserProfile = {
  user_id: string;
  username: string;
  avatar_emoji: string;
  /** Optional uploaded avatar image path (stored in Supabase Storage). */
  avatar_url?: string | null;
  theme_mode: ThemeMode | null;
};

function fallbackUsernameFromEmail(email: string | null | undefined) {
  if (!email) return "User";
  const left = email.split("@")[0] || "User";
  return left.slice(0, 16);
}

export function useSupabaseProfile(userId: string | null | undefined, userEmail?: string | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didInit = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Some projects may not have avatar_url column yet. Try with it first; fallback if missing.
    let data: any = null;
    let e: any = null;
    {
      const res = await supabase
        .from("profiles")
        .select("user_id,username,avatar_emoji,avatar_url,theme_mode")
        .eq("user_id", userId)
        .maybeSingle();
      data = res.data;
      e = res.error;
    }

    if (e && typeof e.message === 'string' && e.message.toLowerCase().includes('avatar_url')) {
      const res2 = await supabase
        .from("profiles")
        .select("user_id,username,avatar_emoji,theme_mode")
        .eq("user_id", userId)
        .maybeSingle();
      data = res2.data;
      e = res2.error;
    }

    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    if (!data) {
      // create a profile row (idempotent)
      const username = fallbackUsernameFromEmail(userEmail);
      const { error: insErr } = await supabase.from("profiles").upsert(
        { user_id: userId, username, avatar_emoji: "🧘", theme_mode: null },
        { onConflict: "user_id" }
      );
      if (insErr) setError(insErr.message);
      // try again
      // Try to re-fetch with avatar_url as well.
      let d2: any = null;
      {
        const r = await supabase
          .from("profiles")
          .select("user_id,username,avatar_emoji,avatar_url,theme_mode")
          .eq("user_id", userId)
          .maybeSingle();
        d2 = r.data;
      }
      setProfile((d2 as any) ?? null);
      setLoading(false);
      return;
    }

    setProfile(data as UserProfile);
    setLoading(false);
  }, [userEmail, userId]);

  const updateProfile = useCallback(
    async (patch: Partial<Omit<UserProfile, "user_id">>) => {
      if (!userId) return { ok: false as const, error: "No user session" };
      setError(null);

      const next = { ...(profile ?? { user_id: userId, username: "User", avatar_emoji: "🧘", avatar_url: null, theme_mode: null }), ...patch };

      // Try writing avatar_url; if the column doesn't exist, fallback.
      const up1 = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, username: next.username, avatar_emoji: next.avatar_emoji, avatar_url: (next as any).avatar_url ?? null, theme_mode: next.theme_mode },
          { onConflict: "user_id" }
        );

      let e = up1.error;
      if (e && typeof e.message === 'string' && e.message.toLowerCase().includes('avatar_url')) {
        const up2 = await supabase
          .from("profiles")
          .upsert(
            { user_id: userId, username: next.username, avatar_emoji: next.avatar_emoji, theme_mode: next.theme_mode },
            { onConflict: "user_id" }
          );
        e = up2.error;
        // If avatar_url isn't supported, don't keep it in local state either.
        (next as any).avatar_url = null;
      }

      if (e) {
        setError(e.message);
        return { ok: false as const, error: e.message };
      }

      setProfile(next);
      return { ok: true as const };
    },
    [profile, userId]
  );

  useEffect(() => {
    if (!userId) {
      didInit.current = null;
      return;
    }
    // Prevent double-init in StrictMode.
    if (didInit.current === userId) return;
    didInit.current = userId;
    refresh();
  }, [refresh, userId]);

  return { profile, loading, error, refresh, updateProfile };
}
