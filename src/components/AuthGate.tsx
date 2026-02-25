import { useMemo, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./rangoliAuth.css";

type PendingProfile = {
  username: string;
  avatar_emoji: string;
};

const PENDING_PROFILE_KEY = "kq_pending_profile_v1";

function clampUsername(v: string) {
  const s = (v || "").trim();
  if (!s) return "User";
  return s.slice(0, 16);
}

function strengthScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s; // 0..4
}

function readPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_PROFILE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as PendingProfile;
    if (!v || typeof v.username !== "string" || typeof v.avatar_emoji !== "string") return null;
    return v;
  } catch {
    return null;
  }
}

function writePendingProfile(p: PendingProfile) {
  try {
    localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch {
    // ignore
  }
}

async function upsertProfile(userId: string, p: PendingProfile) {
  const payload = {
    user_id: userId,
    username: clampUsername(p.username),
    avatar_emoji: p.avatar_emoji || "🧘",
  };
  await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
}

export function AuthGate({ onContinueAsGuest }: { onContinueAsGuest: () => void }) {
  const { isHinglish, isModern } = useTheme();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("🧘");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.includes("@") && password.length >= 6, [email, password]);
  const strength = useMemo(() => strengthScore(password), [password]);
  const strengthClasses = useMemo(() => ["s1", "s2", "s3", "s4"], []);

  async function applyPendingToCurrentUser() {
    const pending = readPendingProfile();
    if (!pending) return;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) return;
    await upsertProfile(uid, pending);
    clearPendingProfile();
  }

  async function handleSubmit() {
    setMsg(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const res = await signIn(email.trim(), password);
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
        await applyPendingToCurrentUser();
        return;
      }

      // signup
      const picked: PendingProfile = {
        username: clampUsername(username),
        avatar_emoji: avatar,
      };

      const res = await signUp(email.trim(), password);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }

      // If email confirmation is enabled, you might not get a session immediately.
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (uid) {
        await upsertProfile(uid, picked);
        clearPendingProfile();
        setMsg(isHinglish ? "Account ban gaya!" : "Account created.");
      } else {
        writePendingProfile(picked);
        setMsg(
          isHinglish
            ? "Signup ho gaya — email confirm karo (agar enabled hai). Pehli login pe profile apply ho jayega."
            : "Signup complete — check your email if confirmation is enabled. We'll apply your name/avatar on first login."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await signInWithGoogle();
      if (!res.ok) setMsg(res.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleForgot() {
    setMsg(null);
    const e = email.trim();
    if (!e.includes("@")) {
      setMsg(isHinglish ? "Pehle email daalo." : "Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const res = await resetPassword(e);
      if (!res.ok) setMsg(res.error);
      else setMsg(isHinglish ? "Reset link email pe bhej diya." : "Password reset link sent (check your email).");
    } finally {
      setBusy(false);
    }
  }

  const strings = {
    badge: isModern ? 'SECURE · SIMPLE · SYNC' : 'CONCEPT · RANGOLI GRID · BOLD',
    tagline: isModern ? 'Thoughtful tasks. Clear weeks.' : 'Level Up Your Dharma',
    tabIn: '🔑 Sign In',
    tabUp: '✨ Sign Up',
    inTitle: isModern ? 'Welcome back' : (isHinglish ? 'Namaste, Yoddha! 🙏' : 'Welcome back, Yoddha! 🙏'),
    inSub: isModern ? 'Sign in to continue where you left off.' : 'Pick up where your karma left off.',
    upTitle: isModern ? 'Create your account' : (isHinglish ? 'Shuru karo! 🚀' : "Let's begin! 🚀"),
    upSub: isModern ? 'Start with a clean workspace. Sync across devices when signed in.' : (isHinglish ? 'Apna warrior identity banao aur karma kamao.' : 'Create your warrior identity and start earning karma.'),
    email: 'Email',
    password: 'Password',
    name: isModern ? 'Your name' : (isHinglish ? 'Apna naam' : 'Your name'),
    avatar: isModern ? 'Choose an avatar' : (isHinglish ? 'Avatar chuno' : 'Pick an avatar'),
    forgot: 'Forgot password?',
    ctaIn: isModern ? 'Sign in' : (isHinglish ? '⚔️ Continue Journey' : '⚔️ Continue Journey'),
    ctaUp: isModern ? 'Create account' : (isHinglish ? '🪔 KarmQuest Shuru Karo!' : '🪔 Start KarmQuest!'),
    or: isHinglish ? '— ya phir —' : '— or —',
    googleIn: isHinglish ? 'Google se login karo' : 'Continue with Google',
    googleUp: isHinglish ? 'Google se signup karo' : 'Sign up with Google',
    guest: isModern ? 'Continue as guest (local only)' : (isHinglish ? 'Guest mode (local only)' : 'Continue as guest (local only)'),
    switchToUp: isModern ? 'New here? Create an account →' : (isHinglish ? 'Naya yoddha? Join karo →' : 'New here? Create an account →'),
    switchToIn: isModern ? 'Already have an account? ← Sign in' : (isHinglish ? 'Pehle se account hai? ← Login karo' : 'Already have an account? ← Sign in'),
    brandIcon: isModern ? '☑️' : '🪔',
    brandName: isModern ? 'Field Notes' : 'KarmQuest',
    emailPlaceholder: isModern ? 'you@work.com' : 'you@karmquest.app',
  };

  return (
    <div className={`kq-auth${isModern ? " kq-auth-modern" : ""}`}>
      <div className="kq-badge">{strings.badge}</div>

      <div className="kq-rangoli-bg" aria-hidden="true">
        <svg className="kq-rangoli-svg" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="kq-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#FFB800" strokeWidth=".5" />
            </pattern>
          </defs>
          <rect width="500" height="500" fill="url(#kq-grid)" />
          <polygon
            points="250,30 470,160 470,340 250,470 30,340 30,160"
            fill="none"
            stroke="#FF6B00"
            strokeWidth="1.5"
          />
          <polygon
            points="250,70 440,180 440,320 250,430 60,320 60,180"
            fill="none"
            stroke="#FFB800"
            strokeWidth="1"
          />
          <polygon
            points="250,110 410,200 410,300 250,390 90,300 90,200"
            fill="none"
            stroke="#CC1A00"
            strokeWidth="1.5"
          />
          <polygon
            points="250,150 380,220 380,280 250,350 120,280 120,220"
            fill="none"
            stroke="#006B5A"
            strokeWidth="1"
          />
          <polygon
            points="250,190 350,240 350,260 250,310 150,260 150,240"
            fill="none"
            stroke="#1A0088"
            strokeWidth="1.5"
          />
          <polygon
            points="250,50 260,240 440,250 260,260 250,450 240,260 60,250 240,240"
            fill="none"
            stroke="#CC006B"
            strokeWidth="1"
          />
          <circle cx="60" cy="60" r="20" fill="none" stroke="#FF6B00" strokeWidth="1" />
          <circle cx="440" cy="60" r="20" fill="none" stroke="#FF6B00" strokeWidth="1" />
          <circle cx="60" cy="440" r="20" fill="none" stroke="#FF6B00" strokeWidth="1" />
          <circle cx="440" cy="440" r="20" fill="none" stroke="#FF6B00" strokeWidth="1" />
          <circle cx="250" cy="250" r="30" fill="none" stroke="#FFB800" strokeWidth="2" />
          <circle cx="250" cy="250" r="15" fill="none" stroke="#FF6B00" strokeWidth="2" />
          <circle cx="250" cy="250" r="5" fill="#CC1A00" />
          <line x1="250" y1="50" x2="250" y2="450" stroke="#FFB800" strokeWidth=".5" />
          <line x1="50" y1="250" x2="450" y2="250" stroke="#FFB800" strokeWidth=".5" />
          <line x1="100" y1="100" x2="400" y2="400" stroke="#FFB800" strokeWidth=".5" />
          <line x1="400" y1="100" x2="100" y2="400" stroke="#FFB800" strokeWidth=".5" />
        </svg>
      </div>

      <div className="kq-card-wrap">
        <div className="kq-tape-top" />
        <div className="kq-card">
          <div className="kq-corner kq-c-tl" />
          <div className="kq-corner kq-c-tr" />
          <div className="kq-corner kq-c-bl" />
          <div className="kq-corner kq-c-br" />

          <div className="kq-brand">
            <div className="kq-brand-row">
              <span className="kq-brand-icon">{strings.brandIcon}</span>
              <h1 className="kq-brand-name">{strings.brandName}</h1>
            </div>
            <div className="kq-brand-tag">{strings.tagline}</div>
            <div className="kq-rangoli-div">
              <div className="kq-rd-line" />
              <span className="kq-rd-gem">🌸</span>
              <div className="kq-rd-line" />
            </div>
          </div>

          <div className="kq-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={`kq-tab ${mode === "signin" ? "on" : ""}`}
              onClick={() => {
                setMode("signin");
                setMsg(null);
              }}
              role="tab"
              aria-selected={mode === "signin"}
            >
              {strings.tabIn}
            </button>
            <button
              type="button"
              className={`kq-tab ${mode === "signup" ? "on" : ""}`}
              onClick={() => {
                setMode("signup");
                setMsg(null);
              }}
              role="tab"
              aria-selected={mode === "signup"}
            >
              {strings.tabUp}
            </button>
          </div>

          <div className="kq-fw">
            {/* Sign In */}
            <div className={`kq-pane ${mode === "signin" ? "on" : "off"}`} id="kq-lp" role="tabpanel">
              <div className="kq-step-title">{strings.inTitle}</div>
              <div className="kq-step-sub">{strings.inSub}</div>

              <div className="kq-ig">
                <label className="kq-il" htmlFor="kq-email-in">
                  {strings.email}
                </label>
                <div className="kq-iw">
                  <span className="kq-ii" aria-hidden="true">
                    ✉️
                  </span>
                  <input
                    id="kq-email-in"
                    className="kq-input"
                    type="email"
                    placeholder={strings.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="kq-ig">
                <label className="kq-il" htmlFor="kq-pass-in">
                  {strings.password}
                </label>
                <div className="kq-iw">
                  <span className="kq-ii" aria-hidden="true">
                    🔒
                  </span>
                  <input
                    id="kq-pass-in"
                    className="kq-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="kq-str-row" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`kq-str-b ${i < strength ? strengthClasses[i] : ""}`}
                    />
                  ))}
                </div>
              </div>

              <div style={{ textAlign: "right", margin: ".3rem 0 .5rem" }}>
                <button type="button" className="kq-link" onClick={handleForgot} disabled={busy}>
                  {strings.forgot}
                </button>
              </div>

              <button className="kq-cta" onClick={handleSubmit} disabled={!canSubmit || busy}>
                {busy ? (isHinglish ? "Please wait..." : "Please wait...") : strings.ctaIn}
              </button>

              <button
                className="kq-g-btn"
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                aria-label={strings.googleIn}
                style={{ marginTop: ".75rem" }}
              >
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
                    fill="#4285F4"
                  />
                  <path
                    d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"
                    fill="#34A853"
                  />
                  <path
                    d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"
                    fill="#EA4335"
                  />
                </svg>
                {strings.googleIn}
              </button>

              <div className="kq-divider">{strings.or}</div>

              <button className="kq-g-btn" type="button" onClick={onContinueAsGuest} disabled={busy}>
                {strings.guest}
              </button>

              <div className="kq-swl">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signup");
                    setMsg(null);
                  }}
                >
                  {strings.switchToUp}
                </a>
              </div>
            </div>

            {/* Sign Up */}
            <div className={`kq-pane ${mode === "signup" ? "on" : "off"}`} id="kq-sp" role="tabpanel">
              <div className="kq-step-title">{strings.upTitle}</div>
              <div className="kq-step-sub">{strings.upSub}</div>

              <label className="kq-il">{strings.avatar}</label>
              <div className="kq-av-g" role="list">
                {["🧘", "⚔️", "🔥", "🦁", "🪷", "🦅"].map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`kq-av ${avatar === a ? "s" : ""}`}
                    onClick={() => setAvatar(a)}
                    aria-label={`Avatar ${a}`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <div className="kq-ig">
                <label className="kq-il" htmlFor="kq-name-up">
                  {strings.name}
                </label>
                <div className="kq-iw">
                  <span className="kq-ii" aria-hidden="true">
                    🏷️
                  </span>
                  <input
                    id="kq-name-up"
                    className="kq-input"
                    type="text"
                    placeholder={isHinglish ? "Tum kaun ho?" : "What should we call you?"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="nickname"
                  />
                </div>
              </div>

              <div className="kq-ig">
                <label className="kq-il" htmlFor="kq-email-up">
                  {strings.email}
                </label>
                <div className="kq-iw">
                  <span className="kq-ii" aria-hidden="true">
                    ✉️
                  </span>
                  <input
                    id="kq-email-up"
                    className="kq-input"
                    type="email"
                    placeholder={strings.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="kq-ig">
                <label className="kq-il" htmlFor="kq-pass-up">
                  {strings.password}
                </label>
                <div className="kq-iw">
                  <span className="kq-ii" aria-hidden="true">
                    🔒
                  </span>
                  <input
                    id="kq-pass-up"
                    className="kq-input"
                    type="password"
                    placeholder={isHinglish ? "Min. 8 characters" : "Min. 8 characters"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="kq-str-row" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`kq-str-b ${i < strength ? strengthClasses[i] : ""}`}
                    />
                  ))}
                </div>
              </div>

              <button className="kq-cta" onClick={handleSubmit} disabled={!canSubmit || busy}>
                {busy ? (isHinglish ? "Please wait..." : "Please wait...") : strings.ctaUp}
              </button>

              <div className="kq-divider">{strings.or}</div>

              <button className="kq-g-btn" type="button" onClick={handleGoogle} disabled={busy} aria-label={strings.googleUp}>
                <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
                    fill="#4285F4"
                  />
                  <path
                    d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"
                    fill="#34A853"
                  />
                  <path
                    d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"
                    fill="#EA4335"
                  />
                </svg>
                {strings.googleUp}
              </button>

              <div className="kq-swl">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setMode("signin");
                    setMsg(null);
                  }}
                >
                  {strings.switchToIn}
                </a>
              </div>
            </div>
          </div>

          {msg ? <div className={`kq-msg ${msg.toLowerCase().includes("error") ? "warn" : ""}`}>{msg}</div> : null}
        </div>
      </div>
    </div>
  );
}
