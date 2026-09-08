import type { Metadata } from "next";
import { allMatchupRows, ownersLite, seasons } from "@/lib/data";
import MatchupsExplorer from "@/components/MatchupsExplorer";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Matchup Explorer" };

export default function MatchupsPage() {
  const rows = allMatchupRows();
  return (
    <div>
      <PageHero eyebrow="Every game ever" title="Matchup Explorer" sub={`${rows.length.toLocaleString()} games. Filter by season, owner, opponent or game type, and sort by whatever you're arguing about.`} />
      <MatchupsExplorer rows={rows} owners={ownersLite} years={seasons.map((s) => s.year).reverse()} />
    </div>
  );
}
