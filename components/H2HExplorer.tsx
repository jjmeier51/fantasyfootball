"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import type { H2HCell, H2HGame, OwnerLite } from "@/lib/types";
import { fmt, matchupTypeLabel, signed, winPct } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";

interface Props {
  owners: OwnerLite[];
  matrix: Record<string, Record<string, H2HCell>>;
  games: Record<string, H2HGame[]>;
}

function OwnerSelect({ owners, value, onChange, exclude }: { owners: OwnerLite[]; value?: string; onChange: (v: string) => void; exclude?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm w-full">
      {owners.map((o) => <option key={o.key} value={o.key} disabled={o.key === exclude}>{o.name}</option>)}
    </select>
  );
}

export default function H2HExplorer({ owners, matrix, games }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const omap = useMemo(() => new Map(owners.map((o) => [o.key, o])), [owners]);
  const [a, setA] = useState(sp.get("a") && omap.has(sp.get("a")!) ? sp.get("a")! : owners[0]?.key);
  const [b, setB] = useState(sp.get("b") && omap.has(sp.get("b")!) ? sp.get("b")! : owners.find((o) => o.key !== (sp.get("a") ?? owners[0]?.key))?.key);
  const set = (which: "a" | "b", v: string) => {
    if (which === "a") setA(v);
    else setB(v);
    const na = which === "a" ? v : a, nb = which === "b" ? v : b;
    router.replace(`/head-to-head?a=${na}&b=${nb}`, { scroll: false });
  };
  const cell = a && b && a !== b ? matrix[a]?.[b] : undefined;
  const pairKey = a && b ? [a, b].sort().join("|") : "";
  const list = (games[pairKey] ?? []).slice().sort((x, y) => y.year - x.year || y.week - x.week);
  const oa = a ? omap.get(a) : undefined, ob = b ? omap.get(b) : undefined;
  const total = cell ? cell.wins + cell.losses + cell.ties : 0;
  const share = total ? (cell!.wins / total) * 100 : 50;

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <div className="flex flex-col items-center gap-2">
          {oa && <OwnerAvatar owner={oa} size={72} ring />}
          <OwnerSelect owners={owners} value={a} onChange={(v) => set("a", v)} exclude={b} />
        </div>
        <div className="font-display text-3xl text-muted">VS</div>
        <div className="flex flex-col items-center gap-2">
          {ob && <OwnerAvatar owner={ob} size={72} ring />}
          <OwnerSelect owners={owners} value={b} onChange={(v) => set("b", v)} exclude={a} />
        </div>
      </div>

      {cell && oa && ob ? (
        <>
          <div className="mt-8 text-center">
            <div className="font-display text-7xl sm:text-8xl leading-none tabular">
              <span className={cell.wins >= cell.losses ? "gold-text" : "text-text-2"}>{cell.wins}</span>
              <span className="text-muted mx-3">–</span>
              <span className={cell.losses > cell.wins ? "gold-text" : "text-text-2"}>{cell.losses}</span>
              {cell.ties ? <span className="text-muted text-4xl"> – {cell.ties}</span> : null}
            </div>
            <div className="text-sm text-muted mt-1">All-time series · {total} games{cell.playoffWins + cell.playoffLosses ? ` · playoffs ${cell.playoffWins}-${cell.playoffLosses}` : ""}</div>
            <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-surface-2 max-w-xl mx-auto">
              <span className="bg-gold" style={{ width: `${share}%` }} />
              <span className="bg-cool flex-1" />
            </div>
            <div className="flex justify-between max-w-xl mx-auto text-xs text-muted mt-1"><span>{oa.name} {winPct(cell.wins, cell.losses, cell.ties)}</span><span>{ob.name} {winPct(cell.losses, cell.wins, cell.ties)}</span></div>
          </div>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-4 text-center"><div className="text-[10px] uppercase tracking-widest text-muted">Avg margin</div><div className={clsx("font-display text-3xl", cell.avgMargin >= 0 ? "text-good" : "text-bad")}>{signed(cell.avgMargin)}</div><div className="text-xs text-muted">for {oa.name}</div></div>
            <div className="card p-4 text-center"><div className="text-[10px] uppercase tracking-widest text-muted">Points</div><div className="font-display text-3xl tabular">{fmt(cell.pointsFor, 0)} <span className="text-muted">–</span> {fmt(cell.pointsAgainst, 0)}</div></div>
            <div className="card p-4 text-center"><div className="text-[10px] uppercase tracking-widest text-muted">Current streak</div><div className="font-display text-3xl">{cell.streak ? `${cell.streak.type === "W" ? oa.name : cell.streak.type === "L" ? ob.name : "Tie"} ${cell.streak.length}` : "—"}</div></div>
            <div className="card p-4 text-center"><div className="text-[10px] uppercase tracking-widest text-muted">Closest game</div><div className="font-display text-3xl tabular">{cell.closest ? fmt(Math.abs(cell.closest.margin)) : "—"}</div><div className="text-xs text-muted">{cell.closest ? `${cell.closest.year} wk ${cell.closest.week}` : ""}</div></div>
          </div>
          <div className="mt-8 card p-5 overflow-x-auto scrollbar-thin">
            <div className="eyebrow mb-3">Every meeting</div>
            <table className="data w-full text-sm">
              <thead><tr><th>Year</th><th>Week</th><th>Type</th><th>{oa.name}</th><th>{ob.name}</th><th>Winner</th><th>Margin</th></tr></thead>
              <tbody>
                {list.map((g) => {
                  const sa = g.scores[a!] ?? 0, sb = g.scores[b!] ?? 0;
                  return (
                    <tr key={g.matchupId}>
                      <td><Link href={`/seasons/${g.year}`} className="font-display text-lg text-gold">{g.year}</Link></td>
                      <td>{g.week}</td>
                      <td className="text-muted">{matchupTypeLabel(g.type)}</td>
                      <td className={clsx("tabular", g.winnerKey === a && "font-semibold text-gold-2")}>{fmt(sa)}</td>
                      <td className={clsx("tabular", g.winnerKey === b && "font-semibold text-gold-2")}>{fmt(sb)}</td>
                      <td>{g.winnerKey ? omap.get(g.winnerKey)?.name : "Tie"}</td>
                      <td className="tabular text-muted">{fmt(Math.abs(sa - sb))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!list.length && <p className="text-sm text-muted">These two have never played.</p>}
          </div>
        </>
      ) : (
        <p className="text-center text-muted mt-8">Pick two different owners.</p>
      )}
      <p className="text-xs text-muted mt-4">Series record excludes consolation games; they still appear in the list.</p>
    </div>
  );
}
