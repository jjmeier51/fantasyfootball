import type { Metadata } from "next";
import Link from "next/link";
import { ownerLite, records, seasonsDesc } from "@/lib/data";
import { fmt } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import { PageHero, Pill } from "@/components/ui";

export const metadata: Metadata = { title: "Seasons" };

export default function SeasonsPage() {
  const trophies = new Map(records.trophies.map((t) => [t.year, t]));
  return (
    <div>
      <PageHero eyebrow="Archive" title="Seasons" sub="Standings, brackets, every week's scores and the draft board for every year." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {seasonsDesc.map((s) => {
          const t = trophies.get(s.year);
          const top = s.honors.topScorer ? s.teams.find((x) => x.ownerKey === s.honors.topScorer) : null;
          return (
            <Link key={s.year} href={`/seasons/${s.year}`} className="card card-hover p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-4xl gold-text">{s.year}</span>
                <span className="text-xs text-muted">{s.teamCount} teams · {s.regSeasonWeeks} wks</span>
              </div>
              {t?.champion ? (
                <div className="flex items-center gap-3 mt-3">
                  <OwnerAvatar owner={ownerLite(t.champion.ownerKey)} logo={t.champion.logo} size={40} ring />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-gold">Champion</div>
                    <div className="font-semibold truncate">{t.champion.name} <span className="text-muted font-normal text-xs">{t.champion.teamName}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted mt-3">{s.isComplete ? "Champion not recorded" : `In progress · ${s.completedWeeks.length} weeks played`}</div>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t?.runnerUp && <Pill>Runner-up {t.runnerUp.name}</Pill>}
                {top && <Pill tone="cool">Top scorer {fmt(top.pointsFor, 0)}</Pill>}
                {s.coverage.tier !== "full" && <Pill tone="gold">Partial data</Pill>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
