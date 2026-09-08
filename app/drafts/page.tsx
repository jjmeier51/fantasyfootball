import type { Metadata } from "next";
import Link from "next/link";
import { ownerLite, ownerName, records, seasonsDesc } from "@/lib/data";
import DraftExplorer from "@/components/DraftExplorer";
import OwnerAvatar from "@/components/OwnerAvatar";
import { PageHero, Pill, SectionHeader } from "@/components/ui";
import { fmt, ordinal } from "@/lib/format";

export const metadata: Metadata = { title: "Draft History" };

export default function DraftsPage() {
  const drafts = seasonsDesc.filter((s) => s.draft.length).map((s) => ({ year: s.year, teamCount: s.teamCount, picks: s.draft.map((p) => ({ ...p, owner: ownerName(p.ownerKey) })) }));
  const firsts = seasonsDesc.map((s) => ({ year: s.year, pick: s.draft.find((p) => p.overall === 1) })).filter((x) => x.pick);
  const d = records.draft;
  const tendencies = d.facts;
  return (
    <div>
      <PageHero eyebrow="War room" title="Draft History" sub="Every board since the beginning, plus who reaches, who waits, and who can't quit their favorite team." />

      {d.greatest.length > 0 && (
        <section className="mb-10">
          <SectionHeader eyebrow="Hall of fame" title="Greatest Draft Picks of All-Time" sub="Players who finished as a top starter at their position after being drafted well down the board. Ranked by how many players at the same position were taken ahead of them versus where they finished." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.greatest.slice(0, 12).map((g) => (
              <Link key={`${g.year}-${g.player}`} href={`/seasons/${g.year}`} className="card card-hover shine p-4 flex gap-3">
                <div className={`font-display text-3xl w-9 shrink-0 ${g.rank! <= 3 ? "gold-text" : "text-muted"}`}>{g.rank}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg leading-tight truncate">{g.player}</div>
                  <div className="text-xs text-muted">{g.position} · {g.proTeam} · {g.year} · drafted by <span className="text-text-2">{ownerName(g.ownerKey)}</span></div>
                  <div className="mt-2 text-sm text-text-2">
                    Taken {ordinal(g.overall)} overall (round {g.round}), the {ordinal(g.posDraftRank ?? 0)} {g.position} off the board. Finished as the <span className="text-gold-2 font-semibold">{g.position}{g.posFinishRank}</span> with {fmt(g.seasonPoints, 1)} points.
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Pill tone="gold">+{g.value} spots</Pill>
                    <Pill>#{g.finishRank} overall scorer</Pill>
                  </div>
                </div>
                <OwnerAvatar owner={ownerLite(g.ownerKey)} size={32} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1">
          <SectionHeader eyebrow="1.01" title="First overall picks" />
          <ul className="space-y-1.5 text-sm">
            {firsts.map(({ year, pick }) => (
              <li key={year} className="flex items-center gap-2">
                <Link href={`/seasons/${year}`} className="font-display text-lg text-gold w-12">{year}</Link>
                <span className="font-medium truncate">{pick!.playerName || "Unknown"}</span>
                <span className="text-muted text-xs">{pick!.position}</span>
                <span className="ml-auto text-xs text-muted truncate">{ownerName(pick!.ownerKey)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5 lg:col-span-2">
          <SectionHeader eyebrow="Habits" title="Draft tendencies" sub={`Patterns across ${d.draftsAnalyzed} drafts. Only genuinely notable habits make the cut.`} />
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {tendencies.map((f) => (
              <li key={f.id} className="flex gap-2 rounded-lg bg-surface-2/60 p-3">
                {f.ownerKey ? <Link href={`/owners/${f.ownerKey}#draft`} className="shrink-0"><OwnerAvatar owner={ownerLite(f.ownerKey)} size={28} /></Link> : <span className="w-7" />}
                <span className="text-text-2">{f.text}</span>
              </li>
            ))}
            {!tendencies.length && <li className="text-muted">Not enough draft data with player positions yet.</li>}
          </ul>
        </div>
      </section>

      {(d.steals.length > 0 || d.busts.length > 0) && (
        <section className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <SectionHeader eyebrow="Value" title="Biggest steals" sub="Drafted late, finished among the top scorers that season." />
            <div className="overflow-x-auto scrollbar-thin"><table className="data w-full text-sm">
              <thead><tr><th>Player</th><th>Year</th><th>Pick</th><th>Finish</th><th>Owner</th></tr></thead>
              <tbody>
                {d.steals.slice(0, 10).map((r, i) => (
                  <tr key={i}><td className="font-medium">{r.player} <span className="text-muted text-xs">{r.position}</span></td><td>{r.year}</td><td className="text-muted">{r.overall}</td><td className="text-good">#{r.finishRank}</td><td>{ownerName(r.ownerKey)}</td></tr>
                ))}
              </tbody>
            </table></div>
          </div>
          <div className="card p-5">
            <SectionHeader eyebrow="Regret" title="Biggest busts" sub="Top-three-round picks that finished nowhere." />
            <div className="overflow-x-auto scrollbar-thin"><table className="data w-full text-sm">
              <thead><tr><th>Player</th><th>Year</th><th>Pick</th><th>Finish</th><th>Owner</th></tr></thead>
              <tbody>
                {d.busts.slice(0, 10).map((r, i) => (
                  <tr key={i}><td className="font-medium">{r.player} <span className="text-muted text-xs">{r.position}</span></td><td>{r.year}</td><td className="text-muted">{r.overall}</td><td className="text-bad">#{r.finishRank}</td><td>{ownerName(r.ownerKey)}</td></tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </section>
      )}

      <section className="mt-8 card p-5">
        <SectionHeader eyebrow="Boards" title="Every draft" />
        <DraftExplorer drafts={drafts} />
      </section>
    </div>
  );
}
