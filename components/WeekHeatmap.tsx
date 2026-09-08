import Link from "next/link";
import clsx from "clsx";
import type { Season } from "@/lib/types";
import { fmt } from "@/lib/format";

/** Owner × week grid of scores, colored on a single-hue ramp; wins outlined. */
export default function WeekHeatmap({ season, nameOf }: { season: Season; nameOf: (k: string) => string }) {
  const weeks = [...new Set(season.matchups.filter((m) => m.decided).map((m) => m.week))].sort((a, b) => a - b);
  if (!weeks.length) return <p className="text-sm text-muted">No completed weeks yet.</p>;
  const cell: Record<string, Record<number, { score: number; won: boolean | null; playoff: boolean; opp: string; id: string }>> = {};
  let min = Infinity, max = -Infinity;
  for (const m of season.matchups) {
    if (!m.decided) continue;
    for (const [me, opp] of [[m.home, m.away], [m.away, m.home]] as const) {
      cell[me.ownerKey] ??= {};
      cell[me.ownerKey][m.week] = { score: me.score, won: m.winnerKey === null ? null : m.winnerKey === me.ownerKey, playoff: m.isPlayoff || m.type !== "NONE", opp: opp.ownerKey, id: m.id };
      if (me.score > 0) { min = Math.min(min, me.score); max = Math.max(max, me.score); }
    }
  }
  const owners = [...season.teams].sort((a, b) => (a.finalRank || 99) - (b.finalRank || 99) || a.seed - b.seed).map((t) => t.ownerKey);
  const shade = (v: number) => {
    const k = max > min ? (v - min) / (max - min) : 0.5;
    return `rgba(52,211,153,${0.08 + k * 0.7})`;
  };
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="text-xs border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="text-left text-muted font-medium pr-2 sticky left-0 bg-surface">Owner</th>
            {weeks.map((w) => <th key={w} className={clsx("text-muted font-medium w-11", w > season.regSeasonWeeks && "text-gold")}>{w > season.regSeasonWeeks ? `P${w - season.regSeasonWeeks}` : w}</th>)}
          </tr>
        </thead>
        <tbody>
          {owners.map((k) => (
            <tr key={k}>
              <td className="pr-2 sticky left-0 bg-surface whitespace-nowrap"><Link href={`/owners/${k}`} className="hover:text-gold">{nameOf(k)}</Link></td>
              {weeks.map((w) => {
                const c = cell[k]?.[w];
                if (!c) return <td key={w} className="w-11 h-8 rounded bg-surface-2/40" />;
                return (
                  <td
                    key={w}
                    title={`Week ${w}: ${fmt(c.score)} vs ${nameOf(c.opp)} (${c.won === null ? "tie" : c.won ? "W" : "L"})`}
                    className={clsx("w-11 h-8 rounded text-center tabular text-[11px]", c.won ? "ring-1 ring-inset ring-gold-2/80 text-text font-semibold" : "text-text-2", c.playoff && "outline outline-1 outline-cool/40")}
                    style={{ background: shade(c.score) }}
                  >
                    {c.score.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-[11px] text-muted mt-2">Brighter green = more points. Outlined cells are wins; P = playoff week.</div>
    </div>
  );
}
