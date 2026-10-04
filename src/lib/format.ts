export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/** ESPN season 2025 = the 2024–25 NBA season. */
export function seasonSpan(season: number): string {
  return `${season - 1}–${String(season).slice(-2)}`;
}

export function formatRecord(w: number | null, l: number | null, t: number | null): string | null {
  if (w === null || l === null) return null;
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

export function formatPct(p: number | null): string | null {
  if (p === null) return null;
  return p.toFixed(3).replace(/^0/, "");
}

export function formatPoints(p: number | null): string | null {
  if (p === null) return null;
  return p.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** Win% where ties count as half a win. */
export function winPct(w: number, l: number, t: number): number | null {
  const games = w + l + t;
  return games > 0 ? (w + t / 2) / games : null;
}
