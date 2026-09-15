import Link from "next/link";
import clsx from "clsx";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { Prediction } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import { Pill } from "@/components/ui";

function Movement({ n }: { n: number | null }) {
  if (n === null) return <span className="inline-flex items-center gap-0.5 text-muted text-[11px]"><Minus size={12} /> new</span>;
  if (n === 0) return <span className="inline-flex items-center gap-0.5 text-muted text-[11px]"><Minus size={12} /></span>;
  return n > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-good text-[11px] font-medium"><ArrowUp size={12} /> {n}</span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-bad text-[11px] font-medium"><ArrowDown size={12} /> {Math.abs(n)}</span>
  );
}

function OddsBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="h-1.5 w-16 sm:w-24 rounded-full bg-white/5 overflow-hidden hidden sm:block">
        <div className={clsx("h-full rounded-full", pct >= 50 ? "bg-good" : pct >= 20 ? "bg-cool" : "bg-bad")} style={{ width: `${pct}%` }} />
      </div>
      <span className={clsx("tabular font-medium w-10 text-right", pct >= 50 ? "text-good" : pct >= 20 ? "text-text" : "text-bad")}>{pct}%</span>
    </div>
  );
}

export default function PredictorTable({ prediction }: { prediction: Prediction }) {
  const cut = prediction.playoffTeamCount;
  return (
    <div className="overflow-x-auto">
      <table className="data w-full">
        <thead>
          <tr>
            <th className="text-right w-8">#</th>
            <th className="w-14">Move</th>
            <th>Team</th>
            <th className="text-right">Now</th>
            <th className="text-right">Proj. record</th>
            <th className="text-right">Playoffs</th>
            <th className="text-right hidden md:table-cell">1st seed</th>
            <th className="hidden lg:table-cell">Injured</th>
          </tr>
        </thead>
        <tbody>
          {prediction.rows.map((r) => (
            <tr key={r.ownerKey} className={clsx(cut && r.rank === cut && "border-b-2 border-b-gold/40")}>
              <td className="text-right text-muted tabular">{r.rank}</td>
              <td><Movement n={r.movement} /></td>
              <td>
                <Link href={`/owners/${r.ownerKey}`} className="flex items-center gap-2.5 min-w-0 group">
                  <OwnerAvatar owner={{ key: r.ownerKey, name: r.name }} logo={r.logo} size={28} />
                  <span className="min-w-0">
                    <span className="block font-medium truncate max-w-[10rem] sm:max-w-none group-hover:text-gold">{r.teamName || r.name}</span>
                    <span className="block text-[11px] text-muted truncate">{r.name}</span>
                  </span>
                </Link>
              </td>
              <td className="text-right tabular text-text-2">{r.currentWins}-{r.currentLosses}</td>
              <td className="text-right tabular font-medium">{fmt(r.projectedWins, 1)}-{fmt(r.projectedLosses, 1)}</td>
              <td className="text-right"><OddsBar pct={r.playoffOdds} /></td>
              <td className="text-right tabular text-text-2 hidden md:table-cell">{r.titleOddsProxy}%</td>
              <td className="hidden lg:table-cell">
                <div className="flex flex-wrap gap-1">
                  {r.injured.length ? r.injured.map((p) => <Pill key={p} tone="bad">{p}</Pill>) : <span className="text-muted text-xs">healthy</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
