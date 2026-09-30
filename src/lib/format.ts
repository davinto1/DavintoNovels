export function formatNaira(kobo: number) {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(naira);
}

export function formatCoins(n: number, symbol = "D-Coins") {
  return `${new Intl.NumberFormat("en-NG").format(n)} ${symbol}`;
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
}

export function relativeTime(iso: string | Date | null | undefined) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 14) return `${day}d ago`;
  return formatDate(d);
}

export function ratingAvg(sum: number, count: number) {
  if (!count) return 0;
  return Math.round((sum / count) * 10) / 10;
}
