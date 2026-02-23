import { useMemo, useState } from "react";
import { LogIn, UserPlus, Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export function AuthGate({ onContinueAsGuest }: { onContinueAsGuest: () => void }) {
  const { isDark, isHinglish } = useTheme();
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const card = isHinglish
    ? "bg-white/75 backdrop-blur-xl border border-rose-200/25 shadow-sm"
    : isDark
      ? "bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-sm"
      : "bg-white/85 backdrop-blur-xl border border-slate-200/60 shadow-sm";

  const input = isHinglish
    ? "bg-white/70 border border-rose-200/30 focus:border-rose-300"
    : isDark
      ? "bg-black/20 border border-white/[0.10] focus:border-white/[0.18]"
      : "bg-white border border-slate-200 focus:border-slate-300";

  const primaryBtn = isHinglish
    ? "bg-rose-600 hover:bg-rose-700 text-white"
    : isDark
      ? "bg-[color:var(--kq-primary)] hover:brightness-110 text-black"
      : "bg-slate-900 hover:bg-slate-800 text-white";

  const secondaryBtn = isHinglish
    ? "bg-white/60 hover:bg-white/80 border border-rose-200/40 text-rose-700"
    : isDark
      ? "bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.10] text-slate-100"
      : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800";

  const title = isHinglish ? "text-rose-700" : isDark ? "text-slate-100" : "text-slate-900";
  const muted = isDark ? "text-slate-400" : "text-slate-600";

  const canSubmit = useMemo(() => email.includes("@") && password.length >= 6, [email, password]);

  async function submit() {
    setMsg(null);
    setBusy(true);
    try {
      const fn = mode === "signin" ? signIn : signUp;
      const res = await fn(email.trim(), password);
      if (!res.ok) setMsg(res.error);
      else if (mode === "signup") setMsg("Account created. Check your email if confirmation is enabled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className={`w-full max-w-md rounded-3xl p-6 sm:p-8 ${card}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-black/10">
            <Sparkles className={isHinglish ? "text-rose-600" : isDark ? "text-[color:var(--kq-primary)]" : "text-slate-900"} />
          </div>
          <div>
            <div className={`text-2xl font-black leading-tight ${title}`}>KarmQuest</div>
            <div className={`text-sm ${muted}`}>Sign in to sync your quests across devices.</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("signin")}
            className={`rounded-2xl px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
              mode === "signin" ? primaryBtn : secondaryBtn
            }`}
          >
            <LogIn size={16} /> Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-2xl px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
              mode === "signup" ? primaryBtn : secondaryBtn
            }`}
          >
            <UserPlus size={16} /> Sign up
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className={`text-xs font-semibold ${muted}`}>Email</label>
          <input
            className={`w-full rounded-2xl px-4 py-3 outline-none ${input}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <label className={`text-xs font-semibold ${muted}`}>Password</label>
          <input
            className={`w-full rounded-2xl px-4 py-3 outline-none ${input}`}
            placeholder="Min 6 characters"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />

          <button
            disabled={!canSubmit || busy}
            onClick={submit}
            className={`w-full rounded-2xl px-4 py-3 font-extrabold transition disabled:opacity-60 disabled:cursor-not-allowed ${primaryBtn}`}
          >
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            onClick={onContinueAsGuest}
            className={`w-full rounded-2xl px-4 py-3 font-bold transition ${secondaryBtn}`}
          >
            Continue as guest (local only)
          </button>

          {msg ? (
            <div className={`mt-2 text-sm ${isDark ? "text-amber-200" : isHinglish ? "text-rose-700" : "text-slate-700"}`}>
              {msg}
            </div>
          ) : null}

          <div className={`mt-4 text-xs ${muted}`}>
            Tip: you can switch between Light / Dark / Hinglish using the palette icon in the top bar after login.
          </div>
        </div>
      </div>
    </div>
  );
}
