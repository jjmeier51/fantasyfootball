/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Mvp } from "@/lib/types";
import { fmt } from "@/lib/format";
import { Pill } from "./ui";

export default function MvpCard({ mvp, ownerName, label }: { mvp: Mvp; ownerName: string; label: string }) {
  const initials = mvp.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isDst = mvp.position === "D/ST";
  return (
    <div className="card p-4 sm:p-5 flex gap-4 items-center">
      <div className="relative shrink-0">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-linear-to-b from-surface-2 to-bg-elev ring-2 ring-gold/60 shadow-[0_0_36px_-10px_rgba(52,211,153,0.5)] flex items-end justify-center">
          {mvp.headshot ? (
            <img src={mvp.headshot} alt={`${mvp.name} headshot`} width={128} height={128} className={isDst ? "w-20 h-20 object-contain mb-5" : "w-full h-full object-cover object-top"} />
          ) : (
            <span className="font-display text-4xl text-text-2 mb-9">{initials}</span>
          )}
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold text-bg text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow">{label}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl sm:text-2xl leading-tight">{mvp.name}</div>
        <div className="text-sm text-text-2 mt-0.5">
          {mvp.position} · {mvp.proTeam} · <Link href={`/seasons/${mvp.year}`} className="text-gold hover:underline">{mvp.year}</Link>
        </div>
        <div className="text-xs text-muted truncate">on {mvp.teamName}</div>
        <div className="font-display text-4xl gold-text tabular mt-2 leading-none">{fmt(mvp.points, 1)}</div>
        <div className="text-[11px] text-muted mt-1">
          {mvp.source === "rostered-weeks"
            ? `pts on ${ownerName}'s roster (${mvp.weeks} of ${mvp.totalWeeks} wks)`
            : "season fantasy points (final roster)"}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mvp.seasonPoints != null && mvp.source === "rostered-weeks" && <Pill>{fmt(mvp.seasonPoints, 1)} full season</Pill>}
          {mvp.espnUrl && (
            <a href={mvp.espnUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-border text-text-2 hover:border-gold/60 hover:text-gold">
              ESPN <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
