import Link from "next/link";
import { ArrowRight, Trophy as TrophyIcon } from "lucide-react";
import { completeSeasons, currentSeason, meta, ownerLite, ownerName, records, reigningTrophy, seasons, teamFor } from "@/lib/data";
import { fmt, matchupTypeLabel, ordinal, record } from "@/lib/format";
import Trophy from "@/components/Trophy";
import FunFactTicker from "@/components/FunFactTicker";
import OwnerAvatar from "@/components/OwnerAvatar";
import { SectionHeader, StatTile, Pill } from "@/components/ui";

function thisWeekInHistory() {
  // the most recently completed week number, replayed across past seasons
  const wk = currentSeason.completedWeeks.length ? Math.max(...currentSeason.completedWeeks) : 1;
  const out = [];
  for (const s of seasons) {
    if (s.year === currentSeason.year) continue;
    const games = s.matchups.filter((m) => m.week === wk && m.decided && !["LOSERS_CONSOLATION_LADDER", "WINNERS_CONSOLATION_LADDER"].includes(m.type));
    if (!games.length) continue;
    const best = games.reduce((a, b) => (Math.abs(a.home.score - a.away.score) < Math.abs(b.home.score - b.away.score) ? a : b));
    out.push({ season: s, m: best });
  }
  return { week: wk, items: out.sort((a, b) => b.season.year - a.season.year).slice(0, 6) };
}

export default function HomePage() {
  const champCount = new Map<string, number>();
  for (const t of records.trophies) if (t.champion) champCount.set(t.champion.ownerKey, (champCount.get(t.champion.ownerKey) ?? 0) + 1);
  const totalTitles = [...champCount.values()].reduce((a, b) => a + b, 0);
  // records.podium is pre-sorted: titles, then fewer finals losses, then earliest title
  const podium = records.podium.filter((p) => p.titles.length).slice(0, 5).map((p) => [p.ownerKey, p.titles.length] as const);
  const top3 = podium.slice(0, 3);
  const top3Share = totalTitles ? Math.round((top3.reduce((a, [, n]) => a + n, 0) / totalTitles) * 100) : 0;
  const top3Names = top3.map(([k]) => ownerName(k));
  const dynastyLine = top3.length === 3 ? `${top3Names[0]}, ${top3Names[1]}, and ${top3Names[2]} have combined for ${top3Share}% of the league's championships (nice).` : "";
  const latestWeek = currentSeason.completedWeeks.length ? Math.max(...currentSeason.completedWeeks) : null;
  const latest = latestWeek ? currentSeason.matchups.filter((m) => m.week === latestWeek && m.decided) : [];
  const history = thisWeekInHistory();
  const rec = (id: string) => records.records.find((r) => r.id === id)?.entries[0];
  const highlights = [
    { r: rec("high-score"), label: "Highest score ever", fmtV: (v: number) => fmt(v) },
    { r: rec("blowout"), label: "Biggest blowout", fmtV: (v: number) => `+${fmt(v, 1)}` },
    { r: rec("closest"), label: "Closest game", fmtV: (v: number) => fmt(v) },
    { r: rec("season-pf"), label: "Best season (points)", fmtV: (v: number) => fmt(v, 1) },
  ];
  const best = records.teamSeasons[0];

  return (
    <div>
      {/* HERO */}
      <section className="relative pt-12 pb-10 grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
        <div>
          <div className="eyebrow mb-3">Est. {meta.firstSeason} · {seasons.length} seasons</div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] gold-text">{meta.leagueName}</h1>
          <p className="mt-4 text-text-2 text-lg max-w-xl">
            Every championship, every blowout, every embarrassing week. The complete history of the league since our freshman year of college, pulled straight from ESPN and preserved forever.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/trophy-room" className="inline-flex items-center gap-2 rounded-full bg-gold text-bg font-semibold px-5 py-2.5 hover:bg-gold-2 transition-colors">
              <TrophyIcon size={16} /> Enter the Trophy Room
            </Link>
            <Link href="/records" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 hover:border-gold/60 transition-colors">
              Records Book <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        {reigningTrophy?.champion && (
          <Link href="/trophy-room" className="card card-hover shine p-6 flex items-center gap-5 justify-center">
            <Trophy year={reigningTrophy.year} line1={reigningTrophy.champion.teamName} line2={reigningTrophy.champion.name} size={150} glow />
            <div>
              <div className="eyebrow">Reigning Champion</div>
              <div className="font-display text-3xl leading-tight mt-1">{reigningTrophy.champion.name}</div>
              <div className="text-text-2 mt-1">{reigningTrophy.champion.teamName}</div>
              <div className="text-sm text-muted mt-2">
                {reigningTrophy.year} · {reigningTrophy.champion.record} · {fmt(reigningTrophy.champion.pointsFor, 1)} pts
              </div>
              {reigningTrophy.titleGame && (
                <div className="text-xs text-muted mt-1">
                  Title game: {fmt(reigningTrophy.titleGame.winnerScore)} – {fmt(reigningTrophy.titleGame.loserScore)} over {reigningTrophy.runnerUp?.name}
                </div>
              )}
            </div>
          </Link>
        )}
      </section>

      <FunFactTicker facts={records.funFacts} />

      {/* STAT STRIP */}
      <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Seasons" value={seasons.length} sub={`${meta.firstSeason}–${meta.currentSeason}`} href="/seasons" />
        <StatTile label="Games played" value={meta.counts.games.toLocaleString()} href="/matchups" />
        <StatTile label="Different champions" value={champCount.size} sub={`in ${completeSeasons.length} completed seasons`} href="/trophy-room" />
        {dynastyLine ? (
          <Link href="/trophy-room" className="card card-hover p-4 h-full">
            <div className="text-[11px] uppercase tracking-widest text-muted">Dynasties</div>
            <div className="font-display text-base sm:text-[17px] leading-snug mt-2 gold-text">{dynastyLine}</div>
          </Link>
        ) : (
          <StatTile label="Most titles" value={podium[0] ? podium[0][1] : "—"} sub={podium[0] ? ownerName(podium[0][0]) : ""} accent href="/trophy-room" />
        )}
      </section>

      {/* PODIUM + LATEST */}
      <section className="mt-10 grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <SectionHeader eyebrow="Dynasties" title="Championship count" action={<Link href="/trophy-room" className="text-sm text-gold hover:underline">Trophy Room →</Link>} />
          <ol className="space-y-3">
            {podium.map(([k], i) => {
              const o = ownerLite(k);
              const years = records.trophies.filter((t) => t.champion?.ownerKey === k).map((t) => t.year);
              return (
                <li key={k} className="flex items-center gap-3">
                  <span className="font-display text-2xl text-muted w-6">{i + 1}</span>
                  <OwnerAvatar owner={o} size={36} />
                  <Link href={`/owners/${k}`} className="font-semibold hover:text-gold">{o.name}</Link>
                  <span className="ml-auto flex items-center gap-1">
                    {years.map((y) => (
                      <span key={y} title={String(y)} className="w-6 h-6 rounded-full bg-gold/15 border border-gold/40 text-[10px] flex items-center justify-center text-gold">
                        {String(y).slice(2)}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="card p-5">
          {latest.length ? (
            <>
              <SectionHeader eyebrow={`${currentSeason.year} season`} title={`Week ${latestWeek} results`} action={<Link href={`/seasons/${currentSeason.year}`} className="text-sm text-gold hover:underline">Season →</Link>} />
              <ul className="space-y-2">
                {latest.map((m) => {
                  const h = teamFor(currentSeason, m.home.ownerKey);
                  const a = teamFor(currentSeason, m.away.ownerKey);
                  const homeWon = m.winnerKey === m.home.ownerKey;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 text-sm border-b border-border/60 pb-2 last:border-0">
                      <span className={homeWon ? "font-semibold" : "text-text-2"}>
                        {ownerName(m.home.ownerKey)} <span className="text-muted text-xs">{h?.name}</span>
                      </span>
                      <span className="tabular font-display text-lg">
                        {fmt(m.home.score)} <span className="text-muted">–</span> {fmt(m.away.score)}
                      </span>
                      <span className={!homeWon && m.winnerKey ? "font-semibold text-right" : "text-text-2 text-right"}>
                        {ownerName(m.away.ownerKey)} <span className="text-muted text-xs">{a?.name}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>
              <SectionHeader eyebrow={`${currentSeason.year} season`} title="Season preview" />
              <p className="text-text-2 text-sm">No games completed yet. Results appear here after the first sync of the season.</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {currentSeason.teams.map((t) => (
                  <li key={t.teamId} className="flex items-center gap-2">
                    <OwnerAvatar owner={ownerLite(t.ownerKey)} logo={t.logo} size={24} />
                    <span className="truncate">{t.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* RECORD SPOTLIGHT */}
      <section className="mt-10">
        <SectionHeader eyebrow="Records" title="All-time marks" action={<Link href="/records" className="text-sm text-gold hover:underline">Full records book →</Link>} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {highlights.map(({ r, label, fmtV }) =>
            r ? (
              <Link key={label} href="/records" className="card card-hover p-4">
                <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
                <div className="font-display text-3xl gold-text mt-1 tabular">{fmtV(r.value)}</div>
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <OwnerAvatar owner={ownerLite(r.ownerKey)} logo={r.logo} size={22} />
                  <span className="font-medium">{ownerName(r.ownerKey)}</span>
                  <span className="text-muted">{r.year}{r.week ? ` wk ${r.week}` : ""}</span>
                </div>
                {r.oppKey && <div className="text-xs text-muted mt-1">vs {ownerName(r.oppKey)} ({fmt(r.oppScore)})</div>}
              </Link>
            ) : null,
          )}
        </div>
      </section>

      {/* BEST TEAM + THIS WEEK IN HISTORY */}
      <section className="mt-10 grid lg:grid-cols-[1fr_1.2fr] gap-6">
        {best && (
          <Link href="/rankings" className="card card-hover shine p-5 flex flex-col">
            <div className="eyebrow">Best team performance of all time</div>
            <div className="flex items-center gap-4 mt-3">
              <OwnerAvatar owner={ownerLite(best.ownerKey)} logo={best.logo} size={64} ring />
              <div>
                <div className="font-display text-2xl sm:text-3xl leading-tight">{best.year} {best.teamName}</div>
                <div className="text-text-2 mt-1">{ownerName(best.ownerKey)} · {record(best.wins, best.losses, best.ties)} · {fmt(best.pointsFor, 1)} pts</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="gold">Score {best.score}</Pill>
              <Pill>Scoring z {best.pfZ > 0 ? "+" : ""}{best.pfZ}</Pill>
              <Pill tone={best.result === "champion" ? "good" : "default"}>{best.result === "champion" ? "Champion" : best.result}</Pill>
            </div>
            <div className="text-xs text-muted mt-auto pt-4">Ranked by win%, era-adjusted scoring and playoff result. See the full leaderboard →</div>
          </Link>
        )}
        <div className="card p-5">
          <SectionHeader eyebrow="This week in league history" title={`Week ${history.week}, through the years`} sub="The closest game from this week of every past season." />
          <ul className="space-y-2">
            {history.items.map(({ season: s, m }) => (
              <li key={m.id} className="flex items-center gap-3 text-sm">
                <Link href={`/seasons/${s.year}`} className="font-display text-xl text-gold w-14">{s.year}</Link>
                <span className="truncate">
                  <span className={m.winnerKey === m.home.ownerKey ? "font-semibold" : ""}>{ownerName(m.home.ownerKey)}</span>
                  <span className="text-muted"> {fmt(m.home.score)} – {fmt(m.away.score)} </span>
                  <span className={m.winnerKey === m.away.ownerKey ? "font-semibold" : ""}>{ownerName(m.away.ownerKey)}</span>
                </span>
                <span className="ml-auto text-xs text-muted hidden sm:inline">{matchupTypeLabel(m.type)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* SEASON STRIP */}
      <section className="mt-10">
        <SectionHeader eyebrow="Timeline" title="Every season" action={<Link href="/seasons" className="text-sm text-gold hover:underline">All seasons →</Link>} />
        <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin">
          {[...records.trophies].reverse().map((t) => (
            <Link key={t.year} href={`/seasons/${t.year}`} className="card card-hover shrink-0 w-44 p-4">
              <div className="font-display text-3xl gold-text">{t.year}</div>
              {t.champion ? (
                <div className="mt-2 flex items-center gap-2">
                  <OwnerAvatar owner={ownerLite(t.champion.ownerKey)} logo={t.champion.logo} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{t.champion.name}</div>
                    <div className="text-[11px] text-muted truncate">{t.champion.teamName}</div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted">{t.isComplete ? "Champion unknown" : "In progress"}</div>
              )}
              {t.lastPlace && <div className="mt-2 text-[11px] text-muted">Sacko: {t.lastPlace.name} ({ordinal(t.teamCount)})</div>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
