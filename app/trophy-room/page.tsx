import type { Metadata } from "next";
import Link from "next/link";
import { ownerLite, ownersLite, records } from "@/lib/data";
import TrophyCase from "@/components/TrophyCase";
import HonorsCard from "@/components/HonorsCard";
import OwnerAvatar from "@/components/OwnerAvatar";
import { PageHero, SectionHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Trophy Room" };

export default function TrophyRoomPage() {
  const trophies = [...records.trophies].sort((a, b) => a.year - b.year);
  const podium = records.podium.filter((p) => p.titles.length);
  return (
    <div>
      <PageHero eyebrow="Hall of champions" title="Trophy Room" sub="One trophy for every season. Click any of them to see the roster that brought it home." />
      <TrophyCase trophies={trophies} owners={ownersLite} order={records.podium.map((p) => p.ownerKey)} />

      <section className="mt-14">
        <SectionHeader eyebrow="Dynasties" title="Championship podium" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {podium.map((p, i) => {
            const o = ownerLite(p.ownerKey);
            return (
              <Link key={p.ownerKey} href={`/owners/${p.ownerKey}`} className="card card-hover p-4 flex items-center gap-4">
                <span className="font-display text-4xl text-muted w-8">{i + 1}</span>
                <OwnerAvatar owner={o} size={48} ring={i === 0} />
                <div className="min-w-0">
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-xs text-muted">{p.titles.join(", ")}</div>
                  <div className="text-xs text-text-2 mt-1">{p.runnerUps.length} runner-up · {p.thirds.length} third · {p.lastPlaces.length} last</div>
                </div>
                <div className="ml-auto font-display text-4xl gold-text">{p.titles.length}</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <SectionHeader eyebrow="Year by year" title="Season honors" sub="Flip a card for the runner-up, third place, top scorer, best record and the sacko." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...trophies].reverse().map((t) => (
            <HonorsCard key={t.year} t={t} />
          ))}
        </div>
      </section>
    </div>
  );
}
