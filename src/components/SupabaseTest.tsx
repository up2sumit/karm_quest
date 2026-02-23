import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type TaskRow = {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
};

export function SupabaseTest() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    // load session on refresh
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? null);
    });

    // listen for login/logout
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
      setTasks([]);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function signOut() {
    setMsg("");
    await supabase.auth.signOut();
  }

  async function loadTasks() {
    setMsg("");
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,done,created_at")
      .order("created_at", { ascending: false });

    if (error) setMsg(error.message);
    setTasks(data ?? []);
  }

  async function addSampleTask() {
    setMsg("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setMsg("Please sign in first.");
      return;
    }

    const { error } = await supabase.from("tasks").insert([
      {
        user_id: u.user.id,
        title: `My task ${new Date().toLocaleTimeString()}`,
        done: false,
      },
    ]);

    if (error) setMsg(error.message);
    else loadTasks();
  }

  return (
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 12, marginTop: 16 }}>
      <h3>Supabase Test</h3>

      {userEmail ? (
        <>
          <p>Signed in as: <b>{userEmail}</b></p>
          <button onClick={signOut}>Sign out</button>{" "}
          <button onClick={loadTasks}>Load tasks</button>{" "}
          <button onClick={addSampleTask}>Add sample task</button>

          <div style={{ marginTop: 12 }}>
            {tasks.map(t => (
              <div key={t.id} style={{ padding: 8, borderBottom: "1px solid #222" }}>
                {t.done ? "✅" : "⬜"} {t.title}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <br />
          <input placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <br />
          <button onClick={signIn}>Sign in</button>
        </>
      )}

      {msg ? <p style={{ color: "tomato" }}>{msg}</p> : null}
    </div>
  );
}