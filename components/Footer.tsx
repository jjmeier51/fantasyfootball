import { meta } from "@/lib/data";
import { dateLabel } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-xs text-muted flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <span className="font-display text-base text-text-2 tracking-wide">{meta.leagueName}</span>
          <span className="mx-2">·</span>Est. {meta.firstSeason}
          <span className="mx-2">·</span>leagueofgangstars.com
        </div>
        <div className="space-x-2">
          <span>Data synced {dateLabel(meta.lastSynced)}{meta.isSample ? " (sample)" : " from ESPN"}</span>
          <span>·</span>
          <span>
            Music: &ldquo;Heroic Age&rdquo; Kevin MacLeod (incompetech.com), CC BY 4.0
          </span>
        </div>
      </div>
    </footer>
  );
}
