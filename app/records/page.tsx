import type { Metadata } from "next";
import { matchupDetail, ownersLite, records, seasons } from "@/lib/data";
import type { MatchupDetail } from "@/lib/data";
import RecordsBook from "@/components/RecordsBook";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Records Book" };

export default function RecordsPage() {
  const details: Record<string, MatchupDetail> = {};
  for (const r of records.records) {
    for (const e of r.entries) {
      if (e.matchupId && !details[e.matchupId]) {
        const d = matchupDetail(e.matchupId);
        if (d) details[e.matchupId] = d;
      }
    }
  }
  const partial = seasons.filter((s) => s.coverage.tier !== "full").map((s) => s.year);
  return (
    <div>
      <PageHero eyebrow="The book" title="All-Time Records" sub="Every mark that matters, with who set it and against whom. Click a game to see the box score.">
        {partial.length > 0 && (
          <p className="text-xs text-muted mt-3">Seasons with incomplete ESPN data ({partial.join(", ")}) only count toward records their data supports.</p>
        )}
      </PageHero>
      <RecordsBook records={records.records} owners={ownersLite} details={details} trades={records.trades.all} tradeSeasons={records.trades.seasonsCovered} />
    </div>
  );
}
