"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { MatchupRow } from "@/lib/data";
import type { OwnerLite } from "@/lib/types";
import { fmt, matchupTypeLabel } from "@/lib/format";

type SortKey = "date" | "high" | "low" | "margin" | "closest" | "combined";

export default function MatchupsExplorer({ rows, owners, years }: { rows: MatchupRow[]; owners: OwnerLite[]; years: number[] }) {
  const [year, setYear] = useState<string>("all");
  const [owner, setOwner] = useState<string>("all");
  const [opp, setOpp] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("date");
  const [min, setMin] = useState<string>("");
  const [limit, setLimit] = useState(100);
  const omap = useMemo(() => new Map(owners.map((o) => [o.key, o.name])), [owners]);
  const name = (k: string | null) => (k ? omap.get(k) ?? k : "");

  const filtered = useMemo(() => {
    let r = rows;
    if (year !== "all") r = r.filter((x) => x.year === Number(year));
    if (owner !== "all") r = r.filter((x) => x.home === owner || x.away === owner);
    if (opp !== "all") r = r.filter((x) => x.home === opp || x.away === opp);
    if (type === "playoff") r = r.filter((x) => x.type === "WINNERS_BRACKET");
    if (type === "regular") r = r.filter((x) => x.type === "NONE");
    if (min) r = r.filter((x) => Math.max(x.homeScore, x.awayScore) >= Number(min));
    const margin = (x: MatchupRow) => Math.abs(x.homeScore - x.awayScore);
    const hi = (x: MatchupRow) => Math.max(x.homeScore, x.awayScore);
    const lo = (x: MatchupRow) => Math.min(x.homeScore, x.awayScore);
    const sorted = [...r];
    switch (sort) {
      case "high": sorted.sort((a, b) => hi(b) - hi(a)); break;
      case "low": sorted.sort((a, b) => lo(a) - lo(b)); break;
      case "margin": sorted.sort((a, b) => margin(b) - margin(a)); break;
      case "closest": sorted.sort((a, b) => margin(a) - margin(b)); break;
      case "combined": sorted.sort((a, b) => b.homeScore + b.awayScore - (a.homeScore + a.awayScore)); break;
      default: sorted.sort((a, b) => b.year - a.year || b.week - a.week);
    }
    return sorted;
  }, [rows, year, owner, opp, type, sort, min]);

  const sel = "bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-sm";
  return (
    <div>
      <div className="card p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <select className={sel} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Season"><option value="all">All seasons</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select className={sel} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner"><option value="all">Any owner</option>{owners.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}</select>
        <select className={sel} value={opp} onChange={(e) => setOpp(e.target.value)} aria-label="Opponent"><option value="all">Any opponent</option>{owners.map((o) => <option key={o.key} value={o.key}>{o.name}</option>)}</select>
        <select className={sel} value={type} onChange={(e) => setType(e.target.value)} aria-label="Game type"><option value="all">All games</option><option value="regular">Regular season</option><option value="playoff">Playoffs</option></select>
        <input className={sel} type="number" placeholder="Min score" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Minimum winning score" />
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort"><option value="date">Newest first</option><option value="high">Highest score</option><option value="low">Lowest score</option><option value="margin">Biggest margin</option><option value="closest">Closest</option><option value="combined">Most combined</option></select>
      </div>
      <div className="text-xs text-muted mt-2">{filtered.length.toLocaleString()} games</div>
      <div className="card mt-3 overflow-x-auto scrollbar-thin">
        <table className="data w-full text-sm">
          <thead><tr><th>Season</th><th>Wk</th><th>Type</th><th className="text-right">Winner</th><th className="text-center">Score</th><th>Loser</th><th className="text-right">Margin</th></tr></thead>
          <tbody>
            {filtered.slice(0, limit).map((x) => {
              const homeWon = x.winner === x.home;
              const w = x.winner ? (homeWon ? x.home : x.away) : null;
              const l = x.winner ? (homeWon ? x.away : x.home) : null;
              const ws = homeWon ? x.homeScore : x.awayScore, ls = homeWon ? x.awayScore : x.homeScore;
              const wt = homeWon ? x.homeTeam : x.awayTeam, lt = homeWon ? x.awayTeam : x.homeTeam;
              return (
                <tr key={x.id}>
                  <td><Link href={`/seasons/${x.year}`} className="font-display text-lg text-gold">{x.year}</Link></td>
                  <td className="text-muted">{x.week}</td>
                  <td className="text-muted text-xs">{matchupTypeLabel(x.type)}</td>
                  <td className="text-right"><Link href={`/owners/${w ?? x.home}`} className="font-semibold hover:text-gold">{name(w ?? x.home)}</Link><span className="block text-[10px] text-muted">{wt}</span></td>
                  <td className="text-center tabular font-display text-lg"><span className="text-gold-2">{fmt(ws)}</span> <span className="text-muted">–</span> {fmt(ls)}</td>
                  <td><Link href={`/owners/${l ?? x.away}`} className={clsx("hover:text-gold", !x.winner && "font-semibold")}>{name(l ?? x.away)}</Link><span className="block text-[10px] text-muted">{lt}</span></td>
                  <td className="text-right tabular text-muted">{fmt(Math.abs(ws - ls))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > limit && (
          <button type="button" onClick={() => setLimit((n) => n + 200)} className="w-full py-3 text-sm text-gold hover:bg-white/5">Show more</button>
        )}
      </div>
    </div>
  );
}
