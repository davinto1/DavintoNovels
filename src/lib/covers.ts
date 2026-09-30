export const COVER_PALETTES = [
  { id: "ink", name: "Night ink", from: "#141312", to: "#2a2622", fg: "#f3efe6", accent: "#b8c4ce" },
  { id: "forest", name: "Harmattan green", from: "#101612", to: "#1e2a22", fg: "#e8efe6", accent: "#a8c4b0" },
  { id: "slate", name: "Harbour slate", from: "#101318", to: "#1c2430", fg: "#e8edf2", accent: "#9eb0c2" },
  { id: "umber", name: "Clay umber", from: "#1a1410", to: "#2c2218", fg: "#f4eadc", accent: "#cbb79a" },
  { id: "wine", name: "Quiet wine", from: "#180f12", to: "#2a181c", fg: "#f3e6ea", accent: "#c4a8b0" },
  { id: "sea", name: "Lagoon", from: "#0e1516", to: "#1a2828", fg: "#e4efee", accent: "#9cc4c0" },
  { id: "dust", name: "Sahel dust", from: "#16120e", to: "#2a2218", fg: "#f0e6d4", accent: "#c2b49a" },
  { id: "iron", name: "Iron night", from: "#121214", to: "#222228", fg: "#ececf0", accent: "#b0b4c0" },
] as const;

export type CoverPaletteId = (typeof COVER_PALETTES)[number]["id"];

export function coverPalette(id: string | null | undefined) {
  return COVER_PALETTES.find((p) => p.id === id) ?? COVER_PALETTES[0];
}

export function paletteFromTitle(title: string): CoverPaletteId {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return COVER_PALETTES[h % COVER_PALETTES.length].id;
}
