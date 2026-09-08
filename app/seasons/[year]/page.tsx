import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeason, ownerLite, ownerName, records, seasons } from "@/lib/data";
import { fmt, matchupTypeLabel, ordinal, record, winPct } from "@/lib/format";
import Bracket from "@/components/Bracket";
import WeekHeatmap from "@/components/WeekHeatmap";
import OwnerAvatar from "@/components/OwnerAvatar";
import Trophy from "@/components/Trophy";
import DraftBoard from "@/components/DraftBoard";
import { CoverageNote, Pill, SectionHeader, StatTile } from "@/components/ui";

export function generateStaticParams() {
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} Season` };
}

export default async function SeasonPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const s = getSeason(year);
  if (!s) notFound();
  const t = records.trophies.find((x) => x.year === s.year);
  const standings = [...s.teams].sort((a, b) => (a.finalRank || 99) - (b.finalRank || 99) || (a.seed || 99) - (b.seed || 99) || b.wins - a.wins || b.pointsFor - a.pointsFor);
  const decided = s.matchups.filter((m) => m.decided);
  // superlatives ignore two-week playoff matchups, whose totals cover two NFL weeks
  const games = decided.filter((m) => !m.multiWeek).flatMap((m) => [
    { k: m.home.ownerKey, score: m.home.score, opp: m.away.ownerKey, oppScore: m.away.score, week: m.week, id: m.id, m },
    { k: m.away.ownerKey, score: m.away.score, opp: m.home.ownerKey, oppScore: m.home.score, week: m.week, id: m.id, m },
  ]);
  const high = games.length ? games.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const low = games.filter((g) => g.score > 0).length ? games.filter((g) => g.score > 0).reduce((a, b) => (b.score < a.score ? b : a)) : null;
  const blow = games.length ? games.reduce((a, b) => (b.score - b.oppScore > a.score - a.oppScore ? b : a)) : null;
  const close = games.filter((g) => g.score > g.oppScore).length ? games.filter((g) => g.score > g.oppScore).reduce((a, b) => (b.score - b.oppScore < a.score - a.oppScore ? b : a)) : null;
  const luck = records.luck.filter((l) => l.year === s.year);
  const luckiest = luck.length ? luck.reduce((a, b) => (b.luck > a.luck ? b : a)) : null;
  const unluckiest = luck.length ? luck.reduce((a, b) => (b.luck < a.luck ? b : a)) : null;
  const weeks = [...new Set(decided.map((m) => m.week))].sort((a, b) => a - b);
  const prev = seasons.find((x) => x.year === s.year - 1);
  const next = seasons.find((x) => x.year === s.year + 1);
  const nameOf = (k: string) => ownerName(k);

  return (
    <div>
      <div className="pt-10 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{s.name || "Season"} · {s.teamCount} teams · {s.regSeasonWeeks}-week regular season · {s.playoffTeamCount || "?"} playoff teams</div>
          <h1 className="font-display text-7xl sm:text-8xl leading-[0.9] gold-text">{s.year}</h1>
          {!s.isComplete && <Pill tone="cool" className="mt-2">In progress · {s.completedWeeks.length} weeks played</Pill>}
        </div>
        <div className="flex gap-2 text-sm">
          {prev ? <Link href={`/seasons/${prev.year}`} className="rounded-full border border-border px-4 py-1.5 hover:border-gold/60">← {prev.year}</Link> : null}
          {next ? <Link href={`/seasons/${next.year}`} className="rounded-full border border-border px-4 py-1.5 hover:border-gold/60">{next.year} →</Link> : null}
        </div>
      </div>
      <CoverageNote tier={s.coverage.tier} needs={s.coverage.screenshotsNeeded} />

      {t?.champion && (
        <section className="mt-6 card shine p-5 grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center">
          <Trophy year={s.year} line1={t.champion.teamName} line2={t.champion.name} size={130} glow />
          <div>
            <div className="eyebrow">Champion</div>
            <Link href={`/owners/${t.champion.ownerKey}`} className="font-display text-5xl leading-none hover:text-gold">{t.champion.name}</Link>
            <div className="text-text-2 mt-1">{t.champion.teamName} · {t.champion.record}{t.champion.seed ? ` · #${t.champion.seed} seed` : ""}</div>
            {t.titleGame && t.runnerUp && (
              <div className="text-sm text-muted mt-2">
                {t.titleGame.winnerScore >= t.titleGame.loserScore ? "Beat" : "Awarded the title over"} {t.runnerUp.name} {fmt(t.titleGame.winnerScore)} – {fmt(t.titleGame.loserScore)} in the final (week {t.titleGame.week}).
              </div>
            )}
            {t.note && (
              <div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-text-2 max-w-xl">
                <span className="text-gold font-semibold">Commissioner&rsquo;s note.</span> {t.note}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-sm">
            {t.runnerUp && <div><span className="text-[10px] uppercase tracking-widest text-muted block">Runner-up</span>{t.runnerUp.name}</div>}
            {t.third && <div><span className="text-[10px] uppercase tracking-widest text-muted block">Third</span>{t.third.name}</div>}
            {t.lastPlace && <div><span className="text-[10px] uppercase tracking-widest text-bad block">Sacko</span>{t.lastPlace.name}</div>}
          </div>
        </section>
      )}

      <section className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="card p-5 overflow-x-auto scrollbar-thin">
          <SectionHeader eyebrow="Standings" title={s.isComplete ? "Final standings" : "Current standings"} />
          <table className="data w-full text-sm">
            <thead><tr><th>#</th><th>Team</th><th>Owner</th><th>Record</th><th>Win%</th><th>PF</th><th>PA</th><th>Seed</th></tr></thead>
            <tbody>
              {standings.map((tm, i) => (
                <tr key={tm.teamId}>
                  <td className={tm.finalRank === 1 ? "text-gold font-display text-lg" : "font-display text-lg text-muted"}>{tm.finalRank || i + 1}</td>
                  <td className="flex items-center gap-2"><OwnerAvatar owner={ownerLite(tm.ownerKey)} logo={tm.logo} size={26} /> {tm.name}</td>
                  <td><Link href={`/owners/${tm.ownerKey}`} className="hover:text-gold">{ownerName(tm.ownerKey)}</Link>{tm.coOwnerKeys.length ? <span className="text-muted text-xs"> +{tm.coOwnerKeys.map(ownerName).join(", ")}</span> : null}</td>
                  <td className="tabular">{record(tm.wins, tm.losses, tm.ties)}</td>
                  <td className="tabular text-muted">{winPct(tm.wins, tm.losses, tm.ties)}</td>
                  <td className="tabular">{fmt(tm.pointsFor, 1)}</td>
                  <td className="tabular text-muted">{fmt(tm.pointsAgainst, 1)}</td>
                  <td className="text-muted">{tm.seed ? `#${tm.seed}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <SectionHeader eyebrow="Season awards" title="Superlatives" />
          <div className="grid grid-cols-2 gap-3">
            {s.honors.topScorer && <StatTile label="Top scorer" value={ownerName(s.honors.topScorer)} sub={`${fmt(s.teams.find((x) => x.ownerKey === s.honors.topScorer)?.pointsFor, 1)} pts`} href={`/owners/${s.honors.topScorer}`} />}
            {s.honors.regSeasonChamp && <StatTile label="Best record" value={ownerName(s.honors.regSeasonChamp)} sub={record(s.teams.find((x) => x.ownerKey === s.honors.regSeasonChamp)!.wins, s.teams.find((x) => x.ownerKey === s.honors.regSeasonChamp)!.losses)} href={`/owners/${s.honors.regSeasonChamp}`} />}
            {high && <StatTile label="High week" value={fmt(high.score)} sub={`${ownerName(high.k)} · wk ${high.week}`} accent />}
            {low && <StatTile label="Low week" value={fmt(low.score)} sub={`${ownerName(low.k)} · wk ${low.week}`} />}
            {blow && <StatTile label="Biggest blowout" value={`+${fmt(blow.score - blow.oppScore, 1)}`} sub={`${ownerName(blow.k)} over ${ownerName(blow.opp)} · wk ${blow.week}`} />}
            {close && <StatTile label="Closest game" value={fmt(close.score - close.oppScore)} sub={`${ownerName(close.k)} over ${ownerName(close.opp)} · wk ${close.week}`} />}
            {luckiest && luckiest.luck > 0 && <StatTile label="Luckiest" value={`+${luckiest.luck.toFixed(1)}`} sub={`${ownerName(luckiest.ownerKey)} · ${luckiest.wins}-${luckiest.losses} (all-play ${luckiest.allPlay})`} />}
            {unluckiest && unluckiest.luck < 0 && <StatTile label="Unluckiest" value={unluckiest.luck.toFixed(1)} sub={`${ownerName(unluckiest.ownerKey)} · ${unluckiest.wins}-${unluckiest.losses} (all-play ${unluckiest.allPlay})`} />}
          </div>
        </div>
      </section>

      <section className="mt-10 card p-5">
        <SectionHeader eyebrow="Playoffs" title="Bracket" />
        <Bracket season={s} nameOf={nameOf} />
      </section>

      <section className="mt-10 card p-5">
        <SectionHeader eyebrow="Week by week" title="Scoring heatmap" sub="Every owner's score every week, ordered by final finish." />
        <WeekHeatmap season={s} nameOf={nameOf} />
      </section>

      <section className="mt-10">
        <SectionHeader eyebrow="Results" title="Every matchup" />
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {weeks.map((w) => (
            <div key={w} className="card p-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display text-xl">Week {w}</span>
                {w > s.regSeasonWeeks && <span className="text-[10px] uppercase tracking-widest text-gold">{matchupTypeLabel(decided.find((m) => m.week === w)?.type ?? "")}{decided.find((m) => m.week === w)?.multiWeek ? " · two-week" : ""}</span>}
              </div>
              <ul className="space-y-1 text-sm">
                {decided.filter((m) => m.week === w).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className={m.winnerKey === m.home.ownerKey ? "font-semibold" : "text-text-2"}>{ownerName(m.home.ownerKey)}</span>
                    <span className="tabular text-xs text-muted">{fmt(m.home.score)} – {fmt(m.away.score)}</span>
                    <span className={m.winnerKey === m.away.ownerKey ? "font-semibold text-right" : "text-text-2 text-right"}>{ownerName(m.away.ownerKey)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 card p-5">
        <SectionHeader eyebrow="Draft" title={`${s.year} draft board`} sub={s.draft.length ? `${s.draft.length} picks` : undefined} />
        {s.draft.length ? (
          <DraftBoard picks={s.draft.map((p) => ({ ...p, owner: ownerName(p.ownerKey) }))} teamCount={s.teamCount} />
        ) : (
          <p className="text-sm text-muted">ESPN did not return a draft for this season.</p>
        )}
      </section>
      <p className="text-xs text-muted mt-6">{ordinal(1)} place is the champion. {s.hasOverride ? "Parts of this season come from league records rather than ESPN." : ""}</p>
    </div>
  );
}
