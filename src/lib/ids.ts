export function makeId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return `${prefix}_${rand}`;
}

export function txId() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DN-${t}-${r}`;
}
