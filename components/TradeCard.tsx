import Link from "next/link";
import clsx from "clsx";
import { Trophy } from "lucide-react";
import type { OwnerLite, Trade, TradeSide } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";
import { Pill } from "./ui";

function Side({ side, won, owner, verdict, champion, year }: { side: TradeSide; won: boolean; owner: OwnerLite; verdict: string; champion: boolean; year: number }) {
  return (
    <div className={clsx("rounded-xl p-3 flex-1 min-w-0", won ? "bg-gold/10 ring-1 ring-gold/40" : "bg-bad/5 ring-1 ring-bad/25")}>
      <div className="flex items-center gap-2">
        <OwnerAvatar owner={owner} size={28} />
        <Link href={`/owners/${side.ownerKey}`} className="font-semibold hover:text-gold truncate">{side.name}</Link>
        {champion && (
          <span className="inline-flex items-center text-gold shrink-0" title={`Won the ${year} championship`} aria-label={`Won the ${year} championship`}>
            <Trophy size={14} />
          </span>
        )}
        <span className={clsx("ml-auto text-[10px] uppercase tracking-widest font-bold", won ? "text-gold" : "text-bad")}>{verdict}</span>
      </div>
      <div className="text-[11px] text-muted mt-0.5 truncate">received</div>
      <ul className="mt-1 space-y-0.5 text-sm">
        {side.received.length ? side.received.map((p, i) => (
          <li key={i} className="flex items-baseline justify-between gap-2">
            <span className="truncate">{p.name} <span className="text-muted text-xs">{p.position}{p.proTeam ? ` · ${p.proTeam}` : ""}</span></span>
            <span className="tabular text-xs text-text-2 shrink-0">{fmt(p.points, 1)}</span>
          </li>
        )) : <li className="text-muted text-xs">nothing back</li>}
      </ul>
      <div className={clsx("font-display text-2xl tabular mt-2", won ? "gold-text" : "text-text-2")}>{fmt(side.points, 1)}</div>
    </div>
  );
}

/** One trade: who won it and by how much, judged by what each haul scored for its new owner afterward. */
export default function TradeCard({ trade, owners, rank, champions }: { trade: Trade; owners: Map<string, OwnerLite>; rank?: number; champions?: Record<number, string | null> }) {
  const o = (k: string) => owners.get(k) ?? { key: k, name: k, color: null, logo: null };
  const champ = champions?.[trade.year] ?? null;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        {rank && <span className={clsx("font-display text-2xl w-8", rank <= 3 ? "gold-text" : "text-muted")}>{rank}</span>}
        <div className="min-w-0">
          <div className="font-semibold">
            <Link href={`/seasons/${trade.year}`} className="text-gold">{trade.year}</Link>
            {trade.week ? <span className="text-muted font-normal"> · before week {trade.week}</span> : null}
          </div>
          <div className="text-xs text-muted">{trade.winner.name} fleeced {trade.loser.name} by {fmt(trade.margin, 1)} points</div>
        </div>
        <Pill tone="gold" className="ml-auto shrink-0">+{fmt(trade.margin, 1)}</Pill>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Side side={trade.winner} won owner={o(trade.winner.ownerKey)} verdict="Won" champion={champ === trade.winner.ownerKey} year={trade.year} />
        <Side side={trade.loser} won={false} owner={o(trade.loser.ownerKey)} verdict="Lost" champion={champ === trade.loser.ownerKey} year={trade.year} />
      </div>
    </div>
  );
}
