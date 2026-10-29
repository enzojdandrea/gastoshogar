import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const fn = mode === "login" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn.call(supabase.auth, { email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Cuenta creada. Si pide confirmación, revisa tu correo.");
  }

  return (
    <main>
      <h1>🏠 Gastos del hogar</h1>
      <p className="sub">Entra para ver tus pagos desde cualquier dispositivo</p>
      <form className="card" onSubmit={submit}>
        <label htmlFor="email">Correo</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="pw">Contraseña</label>
        <input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg && <p className="mu">{msg}</p>}
        <button className="btn" disabled={busy}>
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <button type="button" className="link" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </main>
  );
}
