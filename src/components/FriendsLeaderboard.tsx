import React, { useEffect, useMemo, useState } from "react";

// ✅ Fix: your Supabase client is in src/lib/supabase.ts (as used in App.tsx)
import { supabase } from "../lib/supabase";

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

function weekStartISO(d = new Date()) {
  // Postgres date_trunc('week') uses Monday start.
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "?";
    const b = parts[1]?.[0] ?? "";
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-white/10 ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-white/80">{initials}</span>
      )}
    </div>
  );
}

export default function FriendsLeaderboard() {
  const [tab, setTab] = useState<"leaderboard" | "requests">("leaderboard");
  const [weekStart, setWeekStart] = useState<string>(weekStartISO());
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const [q, setQ] = useState("");
  const [hits, setHits] = useState<ProfileHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);

  async function loadLeaderboard() {
    setLoadingBoard(true);
    setMsg("");
    try {
      const { data, error } = await supabase.rpc("get_weekly_leaderboard", {
        p_week_start: weekStart,
      });
      if (error) throw error;
      setRows((data ?? []) as LeaderRow[]);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load leaderboard");
    } finally {
      setLoadingBoard(false);
    }
  }

  async function loadRequests() {
    setLoadingReq(true);
    setMsg("");
    try {
      const { data, error } = await supabase.rpc("list_incoming_friend_requests");
      if (error) throw error;
      setRequests((data ?? []) as IncomingRequest[]);
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to load requests");
    } finally {
      setLoadingReq(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    if (tab === "requests") loadRequests();
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
        const { data, error } = await supabase.rpc("search_profiles", {
          p_q: term,
          p_limit: 10,
        });
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
    setMsg("");
    try {
      const { data, error } = await supabase.rpc("request_friend", { p_username: username });
      if (error) throw error;
      const status = (data?.[0]?.status ?? "pending") as string;
      setMsg(status === "accepted" ? `✅ You and @${username} are now friends.` : `📩 Request sent to @${username}.`);
      setQ("");
      setHits([]);
      await loadLeaderboard();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to request friend");
    }
  }

  async function respond(otherId: string, action: "accept" | "decline" | "block") {
    setMsg("");
    try {
      const { error } = await supabase.rpc("respond_friend_request", {
        p_other: otherId,
        p_action: action,
      });
      if (error) throw error;
      await loadRequests();
      await loadLeaderboard();
      setMsg(action === "accept" ? "✅ Friend request accepted." : action === "decline" ? "✅ Request declined." : "✅ User blocked.");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed");
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4">
      <div className="rounded-2xl bg-black/30 ring-1 ring-white/10 backdrop-blur p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg sm:text-xl font-semibold text-white">Friends</div>
            <div className="text-xs sm:text-sm text-white/60">Add friends by username and compare weekly Punya.</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("leaderboard")}
              className={`px-3 py-1.5 rounded-lg text-sm ring-1 ${
                tab === "leaderboard"
                  ? "bg-white/10 ring-white/20 text-white"
                  : "bg-transparent ring-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setTab("requests")}
              className={`px-3 py-1.5 rounded-lg text-sm ring-1 ${
                tab === "requests"
                  ? "bg-white/10 ring-white/20 text-white"
                  : "bg-transparent ring-white/10 text-white/70 hover:bg-white/5"
              }`}
            >
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
                placeholder="Add friend by username (e.g. gaurav)"
                className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-white/25"
              />
              <div className="absolute right-2 top-2 text-xs text-white/50">{searching ? "Searching…" : ""}</div>
            </div>

            {!!hits.length && (
              <div className="mt-2 rounded-xl bg-black/40 ring-1 ring-white/10 overflow-hidden">
                {hits.map((h) => (
                  <button
                    key={h.user_id}
                    onClick={() => requestFriend(h.username)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left"
                  >
                    <Avatar url={h.avatar_url} name={h.display_name ?? h.username} />
                    <div className="flex-1">
                      <div className="text-sm text-white font-medium">@{h.username}</div>
                      <div className="text-xs text-white/60">{h.display_name ?? ""}</div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-md bg-white/10 ring-1 ring-white/10 text-white/80">Add</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-white/60">Week starting (Mon)</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-white/25"
            />
          </div>
        </div>

        {msg && <div className="mt-3 text-sm text-white/80 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2">{msg}</div>}

        {tab === "leaderboard" ? (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Weekly Leaderboard</div>
              <button
                onClick={loadLeaderboard}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/10 text-white/80 hover:bg-white/15"
              >
                {loadingBoard ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="mt-3 rounded-2xl overflow-hidden ring-1 ring-white/10">
              <div className="grid grid-cols-[48px_1fr_96px] sm:grid-cols-[56px_1fr_120px] bg-white/5 px-3 py-2 text-xs text-white/60">
                <div>Rank</div>
                <div>User</div>
                <div className="text-right">Punya</div>
              </div>

              {rows.length === 0 && !loadingBoard ? (
                <div className="px-3 py-6 text-sm text-white/60">No data yet. Add friends and complete quests this week.</div>
              ) : (
                rows.map((r) => (
                  <div
                    key={r.user_id}
                    className={`grid grid-cols-[48px_1fr_96px] sm:grid-cols-[56px_1fr_120px] px-3 py-2.5 border-t border-white/10 ${
                      r.is_you ? "bg-emerald-500/10" : "bg-transparent"
                    }`}
                  >
                    <div className="text-sm text-white/80 font-semibold">{r.rank}</div>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar url={r.avatar_url} name={r.display_name} />
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{r.display_name}</div>
                        <div className="text-xs text-white/60 truncate">@{r.username}</div>
                      </div>
                      {r.is_you && (
                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30 text-emerald-100">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-right text-sm text-white font-semibold tabular-nums">{r.xp}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Incoming Requests</div>
              <button
                onClick={loadRequests}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/10 text-white/80 hover:bg-white/15"
              >
                {loadingReq ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            <div className="mt-3 rounded-2xl overflow-hidden ring-1 ring-white/10">
              {requests.length === 0 && !loadingReq ? (
                <div className="px-3 py-6 text-sm text-white/60">No pending requests.</div>
              ) : (
                requests.map((r) => (
                  <div key={r.other_id} className="px-3 py-3 border-t border-white/10 bg-transparent">
                    <div className="flex items-center gap-3">
                      <Avatar url={r.other_avatar_url} name={r.other_display_name ?? r.other_username} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-white font-medium truncate">{r.other_display_name ?? `@${r.other_username}`}</div>
                        <div className="text-xs text-white/60 truncate">@{r.other_username}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => respond(r.other_id, "accept")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-500/30 text-emerald-100 hover:bg-emerald-500/25"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respond(r.other_id, "decline")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 ring-1 ring-white/10 text-white/80 hover:bg-white/15"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => respond(r.other_id, "block")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 ring-1 ring-rose-500/30 text-rose-100 hover:bg-rose-500/25"
                        >
                          Block
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-white/45">Requested: {new Date(r.requested_at).toLocaleString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
