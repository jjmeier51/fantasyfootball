import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import type { WeekRecap, WrapUp } from "@/lib/types";
import { fmt, ordinal } from "@/lib/format";
import { getPrediction, ownerName, recapWeeks, weekly } from "@/lib/data";
import { PageHero, SectionHeader, StatTile } from "@/components/ui";
import GameBox from "./GameBox";
import AwardCard from "./AwardCard";
import StandingsTable from "./StandingsTable";
import PredictorTable from "./PredictorTable";
import WeekPicker from "./WeekPicker";

export default function WrapUpView({ recap, wrap }: { recap: WeekRecap; wrap?: WrapUp }) {
  const sup = recap.superlatives;
  const prediction = getPrediction(recap.week);
  const gameById = new Map(recap.games.map((g) => [g.matchupId, g]));
  const blow = sup.blowout ? gameById.get(sup.blowout.matchupId) : undefined;
  const close = sup.closest ? gameById.get(sup.closest.matchupId) : undefined;
  const loser = (g: typeof blow) => (g ? (g.winnerKey === g.home.ownerKey ? g.away : g.home) : undefined);
  return (
    <div>
      <PageHero eyebrow={`${weekly.year} season · Week ${recap.week}${wrap?.published ? ` · ${wrap.published}` : ""}`} title={wrap?.headline ?? `Week ${recap.week} Wrap Up`} sub={wrap?.dek}>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <WeekPicker weeks={recapWeeks} current={recap.week} base="/wrap-up" />
          <Link href="/standings" className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline">Standings &amp; Playoff Predictor <ArrowRight size={14} /></Link>
        </div>
      </PageHero>

      {wrap && (
        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <div className="card p-5 sm:p-7">
            <div className="eyebrow mb-2">Around the NFL</div>
            <h2 className="font-display text-2xl sm:text-3xl leading-tight">What happened this week, for fantasy purposes</h2>
            <div className="mt-4 space-y-4 text-text-2 leading-relaxed text-[15px]">
              {wrap.nfl.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div className="mt-5 text-[11px] text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Sources:</span>
              {wrap.nfl.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-gold">{s.name} <ExternalLink size={10} /></a>
              ))}
            </div>
          </div>
          <div className="card p-5 sm:p-6">
            <div className="eyebrow mb-3">Quick hits</div>
            <ul className="space-y-3">
              {wrap.nfl.bullets.map((b) => (
                <li key={b.label} className="text-sm leading-relaxed">
                  <span className="font-semibold text-text">{b.label}. </span>
                  <span className="text-text-2">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionHeader eyebrow="League of Gangstars" title={`Week ${recap.week} in the league`} sub={`${recap.games.length} games · ${fmt(sup.totalPoints, 1)} total points · ${fmt(sup.avgScore, 1)} per team`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="High score" value={fmt(sup.highScore?.score)} sub={sup.highScore ? ownerName(sup.highScore.ownerKey) : undefined} accent href={sup.highScore ? `/owners/${sup.highScore.ownerKey}` : undefined} />
          <StatTile label="Low score" value={<span className="text-bad">{fmt(sup.lowScore?.score)}</span>} sub={sup.lowScore ? ownerName(sup.lowScore.ownerKey) : undefined} />
          <StatTile label="Biggest blowout" value={`+${fmt(sup.blowout?.margin, 1)}`} sub={blow ? `${ownerName(blow.winnerKey)} over ${loser(blow)?.name}` : undefined} />
          <StatTile label="Closest game" value={fmt(sup.closest?.margin, 1)} sub={close ? `${ownerName(close.winnerKey)} over ${loser(close)?.name}` : undefined} />
        </div>
        <div className="space-y-4">
          {recap.games.map((g, i) => <GameBox key={g.matchupId} game={g} index={i} blurb={wrap?.games[g.matchupId]} />)}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader eyebrow="Hardware" title="Awards of the week" sub="Player of the week is the top non-QB starter. Dud is the starter who fell furthest below projection. Difference maker is the biggest over-projection on a winning team." />
        <div className="grid md:grid-cols-2 gap-4">
          <AwardCard label="Player of the week" award={recap.awards.playerOfWeek} blurb={wrap?.awards.playerOfWeek} />
          <AwardCard label="QB of the week" award={recap.awards.qbOfWeek} blurb={wrap?.awards.qbOfWeek} />
          <AwardCard label="Dud of the week" award={recap.awards.dud} blurb={wrap?.awards.dud} tone="bad" />
          <AwardCard label="Difference maker" award={recap.awards.differenceMaker} blurb={wrap?.awards.differenceMaker} tone="cool" />
        </div>
      </section>

      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="min-w-0">
          <SectionHeader eyebrow={`Through week ${recap.week}`} title="Standings" sub="Ties broken by points for." action={<Link href="/standings" className="text-sm text-gold hover:underline">Full standings →</Link>} />
          <div className="card p-2 sm:p-4"><StandingsTable rows={recap.standings} playoffTeams={weekly.playoffTeamCount} compact /></div>
        </div>
        {prediction && (
          <div className="min-w-0">
            <SectionHeader eyebrow="Crystal ball" title="Playoff Predictor" sub={`Projected final regular-season order after week ${recap.week}. ${prediction.rows.filter((r) => r.movement).length ? "Arrows show movement since last week." : ""}`} action={<Link href="/standings#predictor" className="text-sm text-gold hover:underline">Details →</Link>} />
            <div className="card p-2 sm:p-4"><PredictorTable prediction={prediction} /></div>
          </div>
        )}
      </section>
      {prediction && (
        <p className="text-xs text-muted mt-4">
          {prediction.rows[0] ? `${prediction.rows[0].name} projects to finish ${ordinal(1)} with about ${fmt(prediction.rows[0].projectedWins, 1)} wins. ` : ""}{wrap?.predictorNote}
        </p>
      )}
    </div>
  );
}
