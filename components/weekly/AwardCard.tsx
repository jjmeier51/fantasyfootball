/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import clsx from "clsx";
import type { WeekAward } from "@/lib/types";
import { fmt, signed } from "@/lib/format";

export default function AwardCard({ label, award, blurb, tone = "gold" }: { label: string; award: WeekAward | null | undefined; blurb?: string; tone?: "gold" | "bad" | "cool" }) {
  if (!award) return null;
  const initials = award.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const isDst = award.position === "D/ST";
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-4">
      <div>
        <span
          className={clsx(
            "inline-block rounded-full text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 shadow",
            tone === "gold" && "bg-gold text-bg",
            tone === "bad" && "bg-bad text-white",
            tone === "cool" && "bg-cool text-white",
          )}
        >
          {label}
        </span>
      </div>
      <div className="flex gap-4 items-center">
        <div className="shrink-0">
          <div
            className={clsx(
              "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-linear-to-b from-surface-2 to-bg-elev ring-2 flex items-end justify-center",
              tone === "gold" && "ring-gold/60 shadow-[0_0_36px_-10px_rgba(52,211,153,0.5)]",
              tone === "bad" && "ring-bad/60 shadow-[0_0_36px_-10px_rgba(239,68,68,0.45)] grayscale-[35%]",
              tone === "cool" && "ring-cool/60 shadow-[0_0_36px_-10px_rgba(79,134,232,0.5)]",
            )}
          >
            {award.headshot ? (
              <img src={award.headshot} alt={`${award.name} headshot`} width={112} height={112} className={isDst ? "w-16 h-16 object-contain mb-5" : "w-full h-full object-cover object-top"} />
            ) : (
              <span className="font-display text-3xl text-text-2 mb-8">{initials}</span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-xl sm:text-2xl leading-tight">{award.name}</div>
          <div className="text-sm text-text-2 mt-0.5">{award.position}{isDst ? "" : ` · ${award.proTeam}`}</div>
          <div className="text-xs text-muted truncate">
            started by <Link href={`/owners/${award.ownerKey}`} className="text-gold hover:underline">{award.ownerName}</Link> ({award.teamName})
          </div>
          <div className={clsx("font-display text-4xl tabular mt-2 leading-none", tone === "bad" ? "text-bad" : "gold-text")}>{fmt(award.points, 1)}</div>
          <div className="text-[11px] text-muted mt-1">
            {award.projected != null ? `projected ${fmt(award.projected, 1)} · ${signed(award.surplus ?? 0)} vs projection` : "fantasy points"}
            {award.won ? " · team won" : " · team lost"}
          </div>
        </div>
      </div>
      {blurb && <p className="text-sm text-text-2 leading-relaxed border-t border-border pt-3">{blurb}</p>}
    </div>
  );
}
