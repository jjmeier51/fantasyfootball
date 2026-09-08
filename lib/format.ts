export function fmt(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtInt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US");
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return (n * 100).toFixed(1) + "%";
}

export function winPct(w: number, l: number, t = 0): string {
  const gp = w + l + t;
  if (!gp) return ".000";
  const v = (w + 0.5 * t) / gp;
  return v >= 1 ? "1.000" : v.toFixed(3).replace(/^0/, "");
}

export function record(w: number, l: number, t = 0): string {
  return t ? `${w}-${l}-${t}` : `${w}-${l}`;
}

export function ordinal(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function signed(n: number, digits = 1): string {
  return (n > 0 ? "+" : "") + n.toFixed(digits);
}

export function matchupTypeLabel(type: string): string {
  switch (type) {
    case "WINNERS_BRACKET":
      return "Playoffs";
    case "LOSERS_CONSOLATION_LADDER":
      return "Toilet Bowl";
    case "WINNERS_CONSOLATION_LADDER":
      return "Consolation";
    default:
      return "Regular Season";
  }
}

export function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
