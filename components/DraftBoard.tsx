"use client";

import { useState } from "react";
import clsx from "clsx";
import type { DraftPick } from "@/lib/types";

type Pick = DraftPick & { owner: string };
const POS_COLORS: Record<string, string> = { QB: "bg-[#7c5cd6]/30 border-[#7c5cd6]/50", RB: "bg-gold/20 border-gold/50", WR: "bg-cool/20 border-cool/50", TE: "bg-good/20 border-good/50", K: "bg-muted/20 border-muted/50", "D/ST": "bg-[#c2410c]/25 border-[#c2410c]/50" };

export default function DraftBoard({ picks, teamCount }: { picks: Pick[]; teamCount: number }) {
  const [view, setView] = useState<"board" | "list">("board");
  const rounds = Math.max(...picks.map((p) => p.round));
  const byRound: Pick[][] = [];
  for (let r = 1; r <= rounds; r++) byRound.push(picks.filter((p) => p.round === r).sort((a, b) => a.pick - b.pick));
  const cols = Math.max(teamCount, ...byRound.map((r) => r.length));
  return (
    <div>
      <div className="flex gap-1 mb-3">
        {(["board", "list"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={clsx("rounded-full px-3 py-1 text-xs border capitalize", view === v ? "border-gold text-gold bg-gold/10" : "border-border text-text-2")}>{v}</button>
        ))}
        <div className="ml-auto flex flex-wrap gap-2 text-[10px] text-muted">
          {Object.entries(POS_COLORS).map(([p, c]) => <span key={p} className={clsx("rounded px-1.5 border", c)}>{p}</span>)}
        </div>
      </div>
      {view === "board" ? (
        <div className="overflow-x-auto scrollbar-thin">
          <div className="grid gap-1 min-w-max" style={{ gridTemplateColumns: `2.5rem repeat(${cols}, minmax(6.5rem, 1fr))` }}>
            {byRound.map((row, ri) => (
              <div key={ri} className="contents">
                <div className="text-[10px] text-muted flex items-center justify-center font-display text-base">R{ri + 1}</div>
                {row.map((p) => (
                  <div key={p.overall} className={clsx("rounded border px-1.5 py-1 text-[11px] leading-tight", POS_COLORS[p.position] ?? "bg-surface-2 border-border")} title={`${p.overall}. ${p.playerName} (${p.position}, ${p.proTeam}) by ${p.owner}${p.seasonPoints != null ? ` · ${p.seasonPoints} pts` : ""}`}>
                    <div className="truncate font-medium">{p.playerName || "Unknown"}</div>
                    <div className="flex justify-between text-[10px] text-text-2"><span>{p.position}{p.proTeam ? ` · ${p.proTeam}` : ""}</span>{p.keeper && <span className="text-gold">K</span>}</div>
                    <div className="truncate text-[10px] text-muted">{p.owner}</div>
                  </div>
                ))}
                {Array.from({ length: cols - row.length }).map((_, i) => <div key={`e${i}`} />)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-thin max-h-[32rem]">
          <table className="data w-full text-sm">
            <thead><tr><th>#</th><th>Rd</th><th>Player</th><th>Pos</th><th>NFL</th><th>Owner</th>{picks.some((p) => p.seasonPoints != null) && <th className="text-right">Season pts</th>}{picks.some((p) => p.bid) && <th className="text-right">Bid</th>}</tr></thead>
            <tbody>
              {[...picks].sort((a, b) => a.overall - b.overall).map((p) => (
                <tr key={p.overall}>
                  <td className="text-muted">{p.overall}</td><td className="text-muted">{p.round}.{p.pick}</td>
                  <td className="font-medium">{p.playerName || "Unknown"}{p.keeper && <span className="text-gold text-xs ml-1">K</span>}</td>
                  <td>{p.position}</td><td className="text-muted">{p.proTeam}</td><td>{p.owner}</td>
                  {picks.some((q) => q.seasonPoints != null) && <td className="text-right tabular">{p.seasonPoints ?? "—"}</td>}
                  {picks.some((q) => q.bid) && <td className="text-right tabular">{p.bid ? `$${p.bid}` : "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
