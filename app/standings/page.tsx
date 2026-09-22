import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { latestPrediction, latestWrapUp, recapWeeks, weekly } from "@/lib/data";
import { fmt } from "@/lib/format";
import { PageHero, SectionHeader, StatTile } from "@/components/ui";
import StandingsTable from "@/components/weekly/StandingsTable";
import PredictorTable from "@/components/weekly/PredictorTable";

export const metadata: Metadata = {
  title: "Standings",
  description: "Current standings and the playoff predictor.",
};

export default function StandingsPage() {
  const rows = weekly.standings;
  const p = latestPrediction;
  const played = Math.max(0, ...rows.map((r) => r.games));
  const remaining = Math.max(0, weekly.regSeasonWeeks - played);
  const history = recapWeeks.filter((w) => weekly.predictions[String(w)]).map((w) => weekly.predictions[String(w)]!);
  const lock = p?.rows.filter((r) => r.playoffOdds >= 90).length ?? 0;
  const bubble = p?.rows.filter((r) => r.playoffOdds >= 25 && r.playoffOdds < 60).length ?? 0;
  return (
    <div>
      <PageHero eyebrow={`${weekly.year} season · through week ${weekly.latestWeek ?? 0}`} title="Standings" sub={`Regular-season standings, ${weekly.playoffTeamCount ?? 6} teams make the playoffs. Ties are broken by points for.`}>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/wrap-up" className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline">Read the Week {weekly.latestWeek} Wrap Up <ArrowRight size={14} /></Link>
        </div>
      </PageHero>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Weeks played" value={played} sub={`${remaining} regular-season weeks left`} />
        <StatTile label="Leader" value={rows[0]?.name ?? "—"} sub={rows[0] ? `${rows[0].wins}-${rows[0].losses} · ${fmt(rows[0].pointsFor, 1)} pts` : undefined} accent />
        <StatTile label="Top scorer" value={[...rows].sort((a, b) => b.pointsFor - a.pointsFor)[0]?.name ?? "—"} sub={`${fmt([...rows].sort((a, b) => b.pointsFor - a.pointsFor)[0]?.pointsFor, 1)} points for`} />
        <StatTile label="Playoff picture" value={p ? `${lock} lock${lock === 1 ? "" : "s"}` : "—"} sub={p ? `${bubble} on the bubble` : undefined} />
      </section>

      <section>
        <div className="card p-2 sm:p-4"><StandingsTable rows={rows} playoffTeams={weekly.playoffTeamCount} /></div>
        <p className="text-xs text-muted mt-2">The line marks the last playoff spot. PF is points for, PA is points against, Diff is the difference.</p>
      </section>

      {p && (
        <section className="mt-12">
          <SectionHeader
            id="predictor"
            eyebrow="Crystal ball"
            title="Playoff Predictor"
            sub={`Projected final regular-season standings after week ${p.week}, based on this week’s results, injuries, the draft (ESPN's rest-of-season projections for every rostered player), each owner’s track record, and the remaining schedule.`}
          />
          <div className="card p-2 sm:p-4"><PredictorTable prediction={p} /></div>
          <div className="text-xs text-muted mt-3 space-y-1">
            <p>{p.method} Playoff odds are the share of simulated seasons where the team finishes in the top {p.playoffTeamCount}; 1st seed is the share where it finishes first. Each team&apos;s rank is remembered week to week, so the Move column shows who climbed and who slid.</p>
            {latestWrapUp?.predictorNote && <p>{latestWrapUp.predictorNote}</p>}
          </div>
        </section>
      )}

      {history.length > 1 && (
        <section className="mt-12">
          <SectionHeader eyebrow="Receipts" title="Predicted finish, week by week" sub="Where the predictor had each team after every week of the season." />
          <div className="card p-2 sm:p-4 overflow-x-auto">
            <table className="data w-full">
              <thead>
                <tr>
                  <th>Team</th>
                  {history.map((h) => <th key={h.week} className="text-right">Wk {h.week}</th>)}
                </tr>
              </thead>
              <tbody>
                {p!.rows.map((r) => (
                  <tr key={r.ownerKey}>
                    <td className="font-medium">{r.name}</td>
                    {history.map((h) => {
                      const row = h.rows.find((x) => x.ownerKey === r.ownerKey);
                      return <td key={h.week} className="text-right tabular">{row ? row.rank : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
