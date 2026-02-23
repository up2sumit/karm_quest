import { useCallback, useEffect, useRef, useState } from "react";
import type { ThemeMode } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";

export type UserProfile = {
  user_id: string;
  username: string;
  avatar_emoji: string;
  theme_mode: ThemeMode | null;
};

function fallbackUsernameFromEmail(email: string | null | undefined) {
  if (!email) return "Yoddha";
  const left = email.split("@")[0] || "Yoddha";
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

    const { data, error: e } = await supabase
      .from("profiles")
      .select("user_id,username,avatar_emoji,theme_mode")
      .eq("user_id", userId)
      .maybeSingle();

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
      const { data: d2 } = await supabase
        .from("profiles")
        .select("user_id,username,avatar_emoji,theme_mode")
        .eq("user_id", userId)
        .maybeSingle();
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

      const next = { ...(profile ?? { user_id: userId, username: "Yoddha", avatar_emoji: "🧘", theme_mode: null }), ...patch };

      const { error: e } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, username: next.username, avatar_emoji: next.avatar_emoji, theme_mode: next.theme_mode },
          { onConflict: "user_id" }
        );

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
