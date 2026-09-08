/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Mvp } from "@/lib/types";
import { fmt } from "@/lib/format";
import { Pill } from "./ui";

export default function MvpCard({ mvp, ownerName }: { mvp: Mvp; ownerName: string }) {
  const initials = mvp.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isDst = mvp.position === "D/ST";
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-5 items-center sm:items-start lg:items-center xl:items-start">
        <div className="relative shrink-0">
          <div className="w-40 h-40 rounded-2xl overflow-hidden bg-linear-to-b from-surface-2 to-bg-elev ring-2 ring-gold/60 shadow-[0_0_40px_-10px_rgba(52,211,153,0.5)] flex items-end justify-center">
            {mvp.headshot ? (
              <img src={mvp.headshot} alt={`${mvp.name} headshot`} width={160} height={160} className={isDst ? "w-28 h-28 object-contain mb-6" : "w-full h-full object-cover object-top"} />
            ) : (
              <span className="font-display text-5xl text-text-2 mb-12">{initials}</span>
            )}
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-gold text-bg text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow">MVP</span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left lg:text-center xl:text-left">
          <div className="font-display text-3xl leading-tight">{mvp.name}</div>
          <div className="text-text-2 mt-1">
            {mvp.position} · {mvp.proTeam} · <Link href={`/seasons/${mvp.year}`} className="text-gold hover:underline">{mvp.year}</Link>
          </div>
          <div className="text-sm text-muted mt-0.5">on {mvp.teamName}</div>
          <div className="font-display text-5xl gold-text tabular mt-3">{fmt(mvp.points, 1)}</div>
          <div className="text-xs text-muted">
            {mvp.source === "rostered-weeks"
              ? `points while on ${ownerName}'s roster (${mvp.weeks} of ${mvp.totalWeeks} weeks)`
              : "season fantasy points (end-of-season roster)"}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 justify-center sm:justify-start lg:justify-center xl:justify-start">
            {mvp.seasonPoints != null && mvp.source === "rostered-weeks" && <Pill>{fmt(mvp.seasonPoints, 1)} full-season</Pill>}
            {mvp.espnUrl && (
              <a href={mvp.espnUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border text-text-2 hover:border-gold/60 hover:text-gold">
                ESPN profile <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted mt-auto pt-4">
        The best single fantasy season by any player on one of {ownerName}&rsquo;s teams. Headshot via ESPN.
      </p>
    </div>
  );
}
