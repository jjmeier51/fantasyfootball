import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ownerLite, ownerName, records } from "@/lib/data";
import { fmt, record, signed, winPct } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import { PageHero, Pill, SectionHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Rankings" };

const RESULT: Record<string, { label: string; tone: "gold" | "good" | "cool" | "default" | "bad" }> = {
  champion: { label: "Champion", tone: "gold" }, runnerUp: { label: "Runner-up", tone: "good" }, third: { label: "Third", tone: "cool" }, playoffs: { label: "Playoffs", tone: "default" }, missed: { label: "Missed playoffs", tone: "bad" },
};

export default function RankingsPage() {
  const top = records.teamSeasons.slice(0, 40);
  const luckSorted = [...records.luck].filter((l) => l.isComplete).sort((a, b) => b.luck - a.luck);
  const careers = new Map(records.careers.map((c) => [c.ownerKey, c]));
  return (
    <div>
      <PageHero eyebrow="Arguments, settled" title="All-Time Rankings" sub="The best single-season teams ever assembled, the greatest owners of all time, and who has been getting lucky." />

      <section>
        <SectionHeader eyebrow="Leaderboard" title="Best team performances of all time" sub="Score = 50 × win% + 15 × era-adjusted scoring (z-score of points within that season) + playoff bonus (champion 25, runner-up 12, third 6, playoffs 3)." />
        <div className="card overflow-x-auto scrollbar-thin">
          <table className="data w-full text-sm">
            <thead><tr><th>#</th><th>Team</th><th>Owner</th><th>Year</th><th>Record</th><th>Points</th><th>Scoring z</th><th>Result</th><th className="text-right">Score</th></tr></thead>
            <tbody>
              {top.map((r) => (
                <tr key={`${r.year}-${r.ownerKey}`}>
                  <td className={clsx("font-display text-xl", r.rank <= 3 ? "text-gold" : "text-muted")}>{r.rank}</td>
                  <td className="flex items-center gap-2"><OwnerAvatar owner={ownerLite(r.ownerKey)} logo={r.logo} size={28} /> <span className="font-medium">{r.teamName}</span></td>
                  <td><Link href={`/owners/${r.ownerKey}`} className="hover:text-gold">{ownerName(r.ownerKey)}</Link></td>
                  <td><Link href={`/seasons/${r.year}`} className="text-gold">{r.year}</Link></td>
                  <td className="tabular">{record(r.wins, r.losses, r.ties)} <span className="text-muted text-xs">{winPct(r.wins, r.losses, r.ties)}</span></td>
                  <td className="tabular">{fmt(r.pointsFor, 1)}</td>
                  <td className={clsx("tabular", r.pfZ >= 0 ? "text-good" : "text-bad")}>{signed(r.pfZ, 2)}</td>
                  <td><Pill tone={RESULT[r.result].tone}>{RESULT[r.result].label}</Pill></td>
                  <td className="text-right font-display text-xl gold-text tabular">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader eyebrow="GOAT" title="Greatest owners of all time" sub="Titles ×10, runner-ups ×4, playoff appearances ×2, regular-season titles ×3, win% ×30, average scoring z ×5, last-place finishes −3. Rows marked adjusted were settled by the commissioner." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {records.goat.map((g) => {
            const c = careers.get(g.ownerKey);
            return (
              <Link key={g.ownerKey} href={`/owners/${g.ownerKey}`} className="card card-hover p-4 flex gap-3">
                <div className={clsx("font-display text-4xl w-10", g.rank <= 3 ? "gold-text" : "text-muted")}>{g.rank}</div>
                <OwnerAvatar owner={ownerLite(g.ownerKey)} size={48} ring={g.rank === 1} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{ownerName(g.ownerKey)} <span className="text-muted text-xs font-normal">{g.seasons} seasons</span>{g.adjusted && <Pill tone="gold" className="ml-2">adjusted</Pill>}</div>
                  {c && <div className="text-xs text-muted">{record(c.wins, c.losses, c.ties)} · {c.titles.length} titles · {c.playoffApps.length} playoffs</div>}
                  <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted">
                    {Object.entries(g.components).filter(([, v]) => v).map(([k, v]) => <span key={k} className="rounded bg-surface-2 px-1.5 py-0.5">{k} {v > 0 ? "+" : ""}{v}</span>)}
                  </div>
                </div>
                <div className="font-display text-3xl gold-text tabular">{g.score}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="luck" className="mt-12 scroll-mt-24">
        <SectionHeader eyebrow="Schedule luck" title="Luck index" sub="Expected wins come from the all-play record (how many teams you outscored each week). Luck = actual wins − expected wins." />
        <div className="grid md:grid-cols-2 gap-4">
          {[{ title: "Luckiest seasons", rows: luckSorted.slice(0, 10), good: true }, { title: "Unluckiest seasons", rows: luckSorted.slice(-10).reverse(), good: false }].map((b) => (
            <div key={b.title} className="card p-4 overflow-x-auto scrollbar-thin">
              <div className="font-display text-2xl mb-2">{b.title}</div>
              <table className="data w-full text-sm">
                <thead><tr><th>Owner</th><th>Year</th><th>Record</th><th>All-play</th><th className="text-right">Luck</th></tr></thead>
                <tbody>
                  {b.rows.map((l) => (
                    <tr key={`${l.year}${l.ownerKey}`}>
                      <td><Link href={`/owners/${l.ownerKey}`} className="hover:text-gold">{ownerName(l.ownerKey)}</Link> <span className="text-muted text-xs">{l.teamName}</span></td>
                      <td>{l.year}</td><td className="tabular">{l.wins}-{l.losses}</td><td className="tabular text-muted">{l.allPlay}</td>
                      <td className={clsx("text-right tabular font-semibold", b.good ? "text-good" : "text-bad")}>{signed(l.luck)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <div className="card p-4 mt-4 overflow-x-auto scrollbar-thin">
          <div className="font-display text-2xl mb-2">Career luck</div>
          <table className="data w-full text-sm">
            <thead><tr><th>Owner</th><th>Record</th><th>Expected wins</th><th>All-play</th><th className="text-right">Luck</th></tr></thead>
            <tbody>
              {[...records.careers].sort((a, b) => b.luck - a.luck).map((c) => (
                <tr key={c.ownerKey}>
                  <td><Link href={`/owners/${c.ownerKey}`} className="hover:text-gold">{c.name}</Link></td>
                  <td className="tabular">{record(c.wins, c.losses, c.ties)}</td><td className="tabular">{c.expectedWins}</td><td className="tabular text-muted">{c.allPlayWins}-{c.allPlayLosses}</td>
                  <td className={clsx("text-right tabular font-semibold", c.luck >= 0 ? "text-good" : "text-bad")}>{signed(c.luck)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
