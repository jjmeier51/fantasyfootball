import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOwner, ownerLite, ownerName, owners, records, seasons } from "@/lib/data";
import { fmt, ordinal, record, signed, winPct } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import Trophy from "@/components/Trophy";
import { FinishChart, PointsChart } from "@/components/charts";
import BestTeamCard from "@/components/BestTeamCard";
import MvpCard from "@/components/MvpCard";
import TradeCard from "@/components/TradeCard";
import { Pill, SectionHeader, StatTile } from "@/components/ui";

export function generateStaticParams() {
  return owners.map((o) => ({ slug: o.key }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: ownerName(slug) };
}

export default async function OwnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const o = getOwner(slug);
  const c = records.careers.find((x) => x.ownerKey === slug);
  if (!o || !c) notFound();
  const lite = ownerLite(slug);
  const h2h = records.h2h.matrix[slug] ?? {};
  const rivals = Object.entries(h2h)
    .filter(([, v]) => v.games > 0)
    .sort((a, b) => b[1].games - a[1].games);
  const goat = records.goat.find((g) => g.ownerKey === slug);
  const bestSeason = records.teamSeasons.find((t) => t.ownerKey === slug);
  const draft = records.draft.profiles[slug];
  const toneRank = { positive: 0, neutral: 1, negative: 2 } as const;
  const facts = records.funFacts.filter((f) => f.ownerKey === slug).sort((a, b) => toneRank[a.tone ?? "neutral"] - toneRank[b.tone ?? "neutral"]);
  const maxTeams = Math.max(...seasons.map((s) => s.teamCount));
  const titles = records.trophies.filter((t) => t.champion?.ownerKey === slug);
  const highlights = records.ownerHighlights[slug];
  const trades = records.trades.byOwner[slug];
  const ownerMap = new Map(records.careers.map((x) => [x.ownerKey, ownerLite(x.ownerKey)]));
  const champions: Record<number, string | null> = Object.fromEntries(records.trophies.map((t) => [t.year, t.champion?.ownerKey ?? null]));
  const history = [...o.seasons].sort((a, b) => b - a).map((y) => ({ year: y, ...o.teamNames[String(y)], logo: o.logos[String(y)] ?? null, finish: c.finishes.find((f) => f.year === y) }));

  return (
    <div>
      <div className="pt-10 pb-6 flex flex-col sm:flex-row sm:items-end gap-5">
        <OwnerAvatar owner={lite} size={112} ring className="shadow-2xl" />
        <div className="flex-1">
          <div className="eyebrow">{o.firstSeason}–{o.lastSeason} · {o.seasons.length} seasons{o.active ? "" : " · retired"}</div>
          <h1 className="font-display text-6xl sm:text-7xl leading-[0.95] gold-text">{o.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.titles.map((y) => <Pill key={y} tone="gold">🏆 {y}</Pill>)}
            {c.runnerUps.map((y) => <Pill key={`r${y}`}>Runner-up {y}</Pill>)}
            {c.lastPlaces.map((y) => <Pill key={`l${y}`} tone="bad">Sacko {y}</Pill>)}
          </div>
        </div>
        {goat && (
          <Link href="/rankings" className="card p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest text-muted">All-time rank</div>
            <div className="font-display text-5xl gold-text">#{goat.rank}</div>
            <div className="text-xs text-muted">GOAT score {goat.score}</div>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatTile label="Record" value={record(c.wins, c.losses, c.ties)} sub={`${winPct(c.wins, c.losses, c.ties)} win pct`} />
        <StatTile label="Championships" value={c.titles.length} sub={`${c.finalsApps.length} finals`} accent />
        <StatTile label="Playoffs" value={`${c.playoffApps.length}/${c.seasons}`} sub={`${c.playoffRecord} in playoffs`} />
        <StatTile label="Points per game" value={fmt(c.ppg, 1)} sub={`${fmt(c.pointsFor, 0)} total`} />
        <StatTile label="Avg finish" value={c.avgFinish ? ordinal(Math.round(c.avgFinish)) : "—"} sub={`best ${ordinal(c.bestFinish)}, worst ${ordinal(c.worstFinish)}`} />
        <StatTile label="Luck" value={signed(c.luck)} sub={`${c.expectedWins} expected wins`} />
      </div>

      {titles.length > 0 && (
        <section className="mt-10">
          <SectionHeader eyebrow="Trophy case" title={`${titles.length} championship${titles.length > 1 ? "s" : ""}`} action={<Link href="/trophy-room" className="text-sm text-gold hover:underline">Trophy Room →</Link>} />
          <div className="flex flex-wrap gap-4">
            {titles.map((t) => (
              <Link key={t.year} href="/trophy-room" className="card card-hover p-3 flex flex-col items-center">
                <Trophy year={t.year} line1={t.champion!.teamName} line2={t.champion!.name} size={120} />
                <div className="text-xs text-muted mt-1">{t.champion!.record}{t.champion!.seed ? ` · #${t.champion!.seed} seed` : ""}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(highlights?.bestTeam || highlights?.bestPlayers?.qb || highlights?.bestPlayers?.flex || highlights?.bestPlayers?.waiver) && (
        <section className="mt-10 grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
          {highlights.bestTeam && (
            <div className="min-w-0">
              <SectionHeader eyebrow="Peak" title="Your best team" sub={`${o.name}'s strongest season, with the roster that did it.`} />
              <BestTeamCard team={highlights.bestTeam} owner={lite} />
            </div>
          )}
          {(highlights.bestPlayers.qb || highlights.bestPlayers.flex || highlights.bestPlayers.waiver) && (
            <div className="min-w-0">
              <SectionHeader eyebrow="Franchise players" title="Your Best Players" sub="Best quarterback season, best non-quarterback season, and the best waiver wire pickup by one of your players." />
              <div className="grid gap-4">
                {highlights.bestPlayers.qb && <MvpCard mvp={highlights.bestPlayers.qb} ownerName={o.name} label="Best QB" />}
                {highlights.bestPlayers.flex && <MvpCard mvp={highlights.bestPlayers.flex} ownerName={o.name} label="Best non-QB" />}
                {highlights.bestPlayers.waiver && <MvpCard mvp={highlights.bestPlayers.waiver} ownerName={o.name} label="Best pickup" />}
              </div>
            </div>
          )}
        </section>
      )}

      {trades && trades.count > 0 && (
        <section className="mt-10">
          <SectionHeader
            eyebrow="Trade desk"
            title="Your best trade"
            sub={`${trades.count} trade${trades.count === 1 ? "" : "s"} since 2019 · won ${trades.wins}, lost ${trades.losses} · net ${trades.netPoints >= 0 ? "+" : ""}${fmt(trades.netPoints, 1)} points`}
            action={<Link href="/records#trades" className="text-sm text-gold hover:underline">All trades →</Link>}
          />
          {trades.best && (
            <div className="max-w-3xl">
              <TradeCard trade={trades.best} owners={ownerMap} champions={champions} />
              {trades.bestNet !== null && trades.bestNet < 0 && (
                <p className="text-xs text-muted mt-2">{o.name} hasn&rsquo;t won a trade yet; this is the one that hurt least.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <SectionHeader eyebrow="Finish by year" title="Where they landed" sub="1 is the championship. Gold line marks first place." />
          <FinishChart finishes={c.finishes} teamCount={maxTeams} />
        </div>
        <div className="card p-5">
          <SectionHeader eyebrow="Scoring" title="Points for vs against" />
          <PointsChart finishes={c.finishes} />
        </div>
      </section>

      <section className="mt-10 grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="card p-5 overflow-x-auto scrollbar-thin">
          <SectionHeader eyebrow="Franchise history" title="Every team name" sub="Stats stick to the owner no matter what the team was called." />
          <table className="data w-full text-sm">
            <thead>
              <tr><th>Year</th><th>Team</th><th>Record</th><th>PF</th><th>Seed</th><th>Finish</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.year}>
                  <td><Link href={`/seasons/${h.year}`} className="font-display text-lg text-gold">{h.year}</Link></td>
                  <td className="flex items-center gap-2"><OwnerAvatar owner={lite} logo={h.logo} size={24} /> {h.name}</td>
                  <td className="tabular">{h.finish ? record(h.finish.wins, h.finish.losses, h.finish.ties) : "—"}</td>
                  <td className="tabular">{h.finish ? fmt(h.finish.pointsFor, 1) : "—"}</td>
                  <td>{h.finish?.seed ? `#${h.finish.seed}` : "—"}</td>
                  <td>{h.finish?.rank ? <span className={h.finish.rank === 1 ? "text-gold font-semibold" : ""}>{ordinal(h.finish.rank)}{h.finish.rank === 1 ? " 🏆" : ""}</span> : h.finish?.isComplete ? "—" : "in progress"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="card p-5">
            <SectionHeader eyebrow="Signature games" title="Best and worst" />
            <ul className="text-sm space-y-2">
              {c.highWeek && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">High week</span> <b className="tabular">{fmt(c.highWeek.value)}</b> <span className="text-muted">{c.highWeek.year} wk {c.highWeek.week} vs {ownerName(c.highWeek.oppKey)}</span></li>}
              {c.lowWeek && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Low week</span> <b className="tabular">{fmt(c.lowWeek.value)}</b> <span className="text-muted">{c.lowWeek.year} wk {c.lowWeek.week} vs {ownerName(c.lowWeek.oppKey)}</span></li>}
              {c.biggestWin && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Biggest win</span> <b className="tabular">+{fmt(c.biggestWin.value, 1)}</b> <span className="text-muted">{c.biggestWin.year} wk {c.biggestWin.week} vs {ownerName(c.biggestWin.oppKey)}</span></li>}
              {c.worstLoss && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Worst loss</span> <b className="tabular">{fmt(c.worstLoss.value, 1)}</b> <span className="text-muted">{c.worstLoss.year} wk {c.worstLoss.week} vs {ownerName(c.worstLoss.oppKey)}</span></li>}
              {c.longestWinStreak && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Win streak</span> <b>{c.longestWinStreak.length}</b> <span className="text-muted">from {c.longestWinStreak.start.year} wk {c.longestWinStreak.start.week}</span></li>}
              {c.longestLossStreak && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Loss streak</span> <b>{c.longestLossStreak.length}</b> <span className="text-muted">from {c.longestLossStreak.start.year} wk {c.longestLossStreak.start.week}</span></li>}
              {bestSeason && <li><span className="text-muted text-xs uppercase tracking-widest w-24 inline-block">Best season</span> <b>{bestSeason.year}</b> <span className="text-muted">{bestSeason.teamName}, ranked #{bestSeason.rank} all-time</span></li>}
            </ul>
          </div>
          {facts.length > 0 && (
            <div className="card p-5">
              <SectionHeader eyebrow="Did you know" title="Fun facts" />
              <ul className="text-sm space-y-2 list-disc pl-4 text-text-2">
                {facts.slice(0, 8).map((f) => <li key={f.id}>{f.text}</li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="card p-5 overflow-x-auto scrollbar-thin">
          <SectionHeader eyebrow="Rivalries" title="Head-to-head vs everyone" action={<Link href={`/head-to-head?a=${slug}`} className="text-sm text-gold hover:underline">Compare →</Link>} />
          <table className="data w-full text-sm">
            <thead><tr><th>Opponent</th><th>Record</th><th>Win%</th><th>Avg margin</th><th>Playoffs</th><th>Streak</th></tr></thead>
            <tbody>
              {rivals.map(([k, v]) => {
                const total = v.wins + v.losses + v.ties;
                const pctv = total ? v.wins / total : 0;
                return (
                  <tr key={k}>
                    <td><Link href={`/head-to-head?a=${slug}&b=${k}`} className="flex items-center gap-2 hover:text-gold"><OwnerAvatar owner={ownerLite(k)} size={22} /> {ownerName(k)}</Link></td>
                    <td className="tabular">{record(v.wins, v.losses, v.ties)}</td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-16 h-1.5 rounded bg-surface-2 overflow-hidden"><span className="block h-full bg-gold" style={{ width: `${pctv * 100}%` }} /></span>
                        <span className="tabular text-xs text-muted">{winPct(v.wins, v.losses, v.ties)}</span>
                      </span>
                    </td>
                    <td className={v.avgMargin >= 0 ? "text-good tabular" : "text-bad tabular"}>{signed(v.avgMargin)}</td>
                    <td className="tabular">{v.playoffWins + v.playoffLosses ? `${v.playoffWins}-${v.playoffLosses}` : "—"}</td>
                    <td className="text-xs">{v.streak ? `${v.streak.type}${v.streak.length}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div id="draft" className="card p-5 scroll-mt-24">
          <SectionHeader eyebrow="Draft tendencies" title="At the draft table" action={<Link href="/drafts" className="text-sm text-gold hover:underline">All drafts →</Link>} />
          {draft ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.drafts}</div><div className="text-[10px] uppercase text-muted">Drafts</div></div>
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.firstQBRound ? `R${draft.firstQBRound}` : "—"}</div><div className="text-[10px] uppercase text-muted">First QB</div></div>
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.firstKRound ? `R${draft.firstKRound}` : "—"}</div><div className="text-[10px] uppercase text-muted">First K</div></div>
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.firstTERound ? `R${draft.firstTERound}` : "—"}</div><div className="text-[10px] uppercase text-muted">First TE</div></div>
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.firstDSTRound ? `R${draft.firstDSTRound}` : "—"}</div><div className="text-[10px] uppercase text-muted">First D/ST</div></div>
                <div className="rounded-lg bg-surface-2 p-3"><div className="font-display text-2xl">{draft.favoriteTeam?.team ?? "—"}</div><div className="text-[10px] uppercase text-muted">Favorite NFL team</div></div>
              </div>
              {draft.earlyRoundMix && (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Rounds 1–3 position mix</div>
                  <div className="flex h-3 rounded overflow-hidden gap-px">
                    {Object.entries(draft.earlyRoundMix).map(([pos, p]) => (
                      <span key={pos} title={`${pos} ${p}%`} style={{ width: `${p}%`, background: { RB: "#27a865", WR: "#4f86e8", QB: "#7c5cd6", TE: "#b8c2cf", K: "#7f8a99", "D/ST": "#c2410c" }[pos] ?? "#374151" }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-[11px] text-muted">
                    {Object.entries(draft.earlyRoundMix).map(([pos, p]) => <span key={pos}>{pos} {p}%</span>)}
                  </div>
                </div>
              )}
              {draft.favoriteTeam && (
                <p className="text-sm text-text-2 mt-4">
                  {draft.favoriteTeam.picks} picks have been {draft.favoriteTeam.name} ({draft.favoriteTeam.pct}% vs {draft.favoriteTeam.leaguePct}% league-wide).
                  {draft.mostDraftedPlayer && draft.mostDraftedPlayer.times > 1 && <> Most drafted player: {draft.mostDraftedPlayer.name} ({draft.mostDraftedPlayer.times}×).</>}
                </p>
              )}
              {draft.facts.length > 0 && (
                <ul className="mt-3 text-sm space-y-1.5 list-disc pl-4 text-text-2">
                  {draft.facts.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">No draft data for this owner.</p>
          )}
        </div>
      </section>
    </div>
  );
}
