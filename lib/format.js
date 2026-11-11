// Formatters safe to use from both server and client components.

export const nf = new Intl.NumberFormat("en-US");
export const fmtNumber = (n) => nf.format(Math.round(n || 0));

export function formatMoney(amount, currency = "usd") {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: String(currency).toUpperCase(), maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
  } catch {
    return `${value} ${String(currency).toUpperCase()}`;
  }
}

export function formatDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "—";
  }
}

/** "3 days ago", "in 12 days" */
export function relativeDays(value) {
  if (!value) return "";
  const days = Math.round((new Date(value).getTime() - Date.now()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
