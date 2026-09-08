import type { Metadata } from "next";
import Link from "next/link";
import { owners, records } from "@/lib/data";
import { record, winPct } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Owners" };

export default function OwnersPage() {
  const careers = new Map(records.careers.map((c) => [c.ownerKey, c]));
  const sorted = [...owners].sort((a, b) => {
    const ca = careers.get(a.key), cb = careers.get(b.key);
    return (cb?.titles.length ?? 0) - (ca?.titles.length ?? 0) || (cb?.winPct ?? 0) - (ca?.winPct ?? 0);
  });
  return (
    <div>
      <PageHero eyebrow="The people" title="Owners" sub="Records follow the person, not the team name. Every rename, every logo, every season." />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((o) => {
          const c = careers.get(o.key);
          const names = [...new Set(Object.values(o.teamNames).map((t) => t.name))];
          return (
            <Link key={o.key} href={`/owners/${o.key}`} className="card card-hover shine p-4 flex gap-4">
              <OwnerAvatar owner={{ key: o.key, name: o.name, color: o.color, logo: o.currentLogo }} size={64} ring={(c?.titles.length ?? 0) > 0} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl leading-none">{o.name}</span>
                  {!o.active && <span className="text-[10px] uppercase tracking-widest text-muted border border-border rounded px-1">Retired</span>}
                </div>
                <div className="text-xs text-muted mt-0.5">{o.firstSeason}–{o.lastSeason} · {o.seasons.length} seasons</div>
                {c && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div><div className="font-display text-xl">{record(c.wins, c.losses, c.ties)}</div><div className="text-[10px] text-muted uppercase">{winPct(c.wins, c.losses, c.ties)}</div></div>
                    <div><div className="font-display text-xl gold-text">{c.titles.length}</div><div className="text-[10px] text-muted uppercase">Titles</div></div>
                    <div><div className="font-display text-xl">{c.playoffApps.length}</div><div className="text-[10px] text-muted uppercase">Playoffs</div></div>
                  </div>
                )}
                <div className="text-[11px] text-muted mt-2 truncate">{names.join(" · ")}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
