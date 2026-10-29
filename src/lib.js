export const money = (n) =>
  "$" + Number(n).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmtDate = (d) =>
  d.toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });

export const todayISO = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

// Próximo vencimiento: el día indicado del mes siguiente al pago
export function nextDue(paid, day) {
  const y = paid.getFullYear();
  const m = paid.getMonth() + 1;
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}

export function dueText(days) {
  if (days < 0) return `Vencido hace ${-days} d`;
  if (days === 0) return "¡Vence hoy!";
  if (days === 1) return "Vence mañana";
  return `En ${days} días`;
}
