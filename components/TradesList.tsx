import type { OwnerLite, Trade } from "@/lib/types";
import TradeCard from "./TradeCard";

export default function TradesList({ trades, owners, seasonsCovered, limit = 10 }: { trades: Trade[]; owners: OwnerLite[]; seasonsCovered: number[]; limit?: number }) {
  const map = new Map(owners.map((o) => [o.key, o]));
  if (!trades.length) {
    return (
      <div className="card p-6 text-sm text-text-2">
        <div className="font-display text-xl mb-1">No trades on file yet</div>
        ESPN keeps a trade log from 2019 onward. It is pulled during the weekly sync; run the workflow with <span className="text-gold">full refresh</span> once to load every season&rsquo;s trades.
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-muted mb-4">
        Each side is judged by what the players it received went on to score for their new owner over the rest of that season.
        {seasonsCovered.length ? ` Covers ${seasonsCovered[0]}–${seasonsCovered[seasonsCovered.length - 1]}; ESPN has no trade history before 2019.` : ""}
      </p>
      <div className="grid lg:grid-cols-2 gap-4">
        {trades.slice(0, limit).map((t) => <TradeCard key={t.id} trade={t} owners={map} rank={t.rank} />)}
      </div>
    </div>
  );
}
