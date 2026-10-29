import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth.jsx";
import { money, parseDate, fmtDate, todayISO, nextDue, dueText } from "./lib.js";

const SERVICIOS = ["Luz", "Agua", "Gas", "Internet", "Teléfono", "Cable / TV", "Predial", "Tenencia / Vehicular", "Expensas / Mantenimiento", "Seguro"];
const empty = { service: "", description: "", amount: "", paid_date: todayISO(), due_day: "" };

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Auth />;
  return <Tracker />;
}

function Tracker() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("payments").select("*").order("paid_date", { ascending: false });
    if (error) setError("No se pudieron cargar los pagos: " + error.message);
    else setRows(data);
  }
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    const due_day = parseInt(form.due_day, 10);
    if (!form.service.trim() || isNaN(amount) || !form.paid_date || !(due_day >= 1 && due_day <= 31)) {
      setError("Completa servicio, monto, fecha de pago y día de vencimiento (1 a 31).");
      return;
    }
    setError("");
    setSaving(true);
    const { error } = await supabase.from("payments").insert({
      service: form.service.trim(),
      description: form.description.trim(),
      amount,
      paid_date: form.paid_date,
      due_day,
    });
    setSaving(false);
    if (error) return setError("No se pudo guardar: " + error.message);
    setForm({ ...empty, paid_date: todayISO() });
    load();
  }

  async function remove(id) {
    if (!confirm("¿Eliminar este pago?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) setError(error.message);
    else setRows(rows.filter((r) => r.id !== id));
  }

  const { upcoming, totalMonth, totalYear } = useMemo(() => {
    const t = new Date();
    const today = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    let totalMonth = 0, totalYear = 0;
    const latest = {};
    rows.forEach((r) => {
      const d = parseDate(r.paid_date);
      if (d.getFullYear() === today.getFullYear()) {
        totalYear += Number(r.amount);
        if (d.getMonth() === today.getMonth()) totalMonth += Number(r.amount);
      }
      const k = r.service.toLowerCase();
      if (!latest[k] || d > parseDate(latest[k].paid_date)) latest[k] = r;
    });
    const upcoming = Object.values(latest)
      .map((r) => {
        const due = nextDue(parseDate(r.paid_date), r.due_day);
        return { r, due, days: Math.round((due - today) / 864e5) };
      })
      .sort((a, b) => a.days - b.days);
    return { upcoming, totalMonth, totalYear };
  }, [rows]);

  return (
    <main>
      <div className="row">
        <h1>🏠 Gastos del hogar</h1>
        <button className="link" onClick={() => supabase.auth.signOut()}>Salir</button>
      </div>
      <p className="sub">Servicios e impuestos de tu domicilio</p>

      {upcoming.filter((i) => i.days <= 3).map((i) => (
        <div key={i.r.id} className={"alert" + (i.days < 0 ? " e" : "")}>
          {i.days < 0 ? "⚠️ " : "🔔 "}{i.r.service}: {dueText(i.days).toLowerCase()}
        </div>
      ))}

      <div className="sum">
        <div className="card"><div className="mu">Pagado este mes</div><div className="big">{money(totalMonth)}</div></div>
        <div className="card"><div className="mu">Pagado este año</div><div className="big">{money(totalYear)}</div></div>
      </div>

      <h2>Próximos vencimientos</h2>
      {upcoming.length === 0 && <div className="empty">Aún no hay vencimientos. Registra tu primer pago.</div>}
      {upcoming.map(({ r, due, days }) => (
        <div key={r.id} className="card row">
          <div>
            <div className="nm">{r.service}</div>
            <div className="mu">Vence el {fmtDate(due)}. Último pago: {money(r.amount)}</div>
          </div>
          <span className={"tag" + (days < 0 ? " e" : days <= 3 ? " w" : "")}>{dueText(days)}</span>
        </div>
      ))}

      <h2>Registrar pago</h2>
      <form className="card" onSubmit={save}>
        <label htmlFor="svc">Servicio o impuesto</label>
        <input id="svc" list="sl" placeholder="Luz, Agua, Predial…" autoComplete="off" value={form.service} onChange={set("service")} />
        <datalist id="sl">{SERVICIOS.map((s) => <option key={s} value={s} />)}</datalist>

        <label htmlFor="desc">Descripción</label>
        <input id="desc" placeholder="Ej. Recibo de octubre" value={form.description} onChange={set("description")} />

        <div className="g2">
          <div>
            <label htmlFor="amt">Monto</label>
            <input id="amt" type="number" inputMode="decimal" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={set("amount")} />
          </div>
          <div>
            <label htmlFor="pd">Fecha de pago</label>
            <input id="pd" type="date" value={form.paid_date} onChange={set("paid_date")} />
          </div>
        </div>

        <label htmlFor="dd">Día del mes en que vuelve a vencer (1 a 31)</label>
        <input id="dd" type="number" inputMode="numeric" min="1" max="31" placeholder="Ej. 15" value={form.due_day} onChange={set("due_day")} />

        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={saving}>{saving ? "Guardando…" : "Guardar pago"}</button>
      </form>

      <h2>Historial</h2>
      {rows.length === 0 && <div className="empty">Sin pagos registrados.</div>}
      {rows.map((r) => (
        <div key={r.id} className="card row">
          <div>
            <div className="nm">{r.service}</div>
            <div className="mu">{r.description || "Sin descripción"}. {fmtDate(parseDate(r.paid_date))}</div>
          </div>
          <div className="row">
            <span className="amt">{money(r.amount)}</span>
            <button className="x" aria-label="Eliminar" onClick={() => remove(r.id)}>×</button>
          </div>
        </div>
      ))}
    </main>
  );
}
