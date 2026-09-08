"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { Trophy as TrophyT } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";

function Row({ label, side, tone }: { label: string; side: TrophyT["champion"]; tone?: string }) {
  if (!side) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={clsx("text-[10px] uppercase tracking-widest w-20 shrink-0", tone ?? "text-muted")}>{label}</span>
      <OwnerAvatar owner={{ key: side.ownerKey, name: side.name }} logo={side.logo} size={22} />
      <Link href={`/owners/${side.ownerKey}`} className="font-medium hover:text-gold truncate" onClick={(e) => e.stopPropagation()}>{side.name}</Link>
      <span className="text-muted text-xs truncate">{side.teamName}</span>
    </div>
  );
}

export default function HonorsCard({ t }: { t: TrophyT }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button type="button" onClick={() => setFlipped((v) => !v)} className="text-left [perspective:1000px] w-full h-56" aria-label={`${t.year} honors; click to flip`}>
      <div className={clsx("relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d]", flipped && "[transform:rotateY(180deg)]")}>
        <div className="absolute inset-0 card p-4 [backface-visibility:hidden] flex flex-col">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-3xl gold-text">{t.year}</span>
            <span className="text-[10px] text-muted uppercase tracking-widest">{t.isComplete ? "Final" : "In progress"}</span>
          </div>
          {t.champion ? (
            <div className="flex items-center gap-3 mt-3">
              <OwnerAvatar owner={{ key: t.champion.ownerKey, name: t.champion.name }} logo={t.champion.logo} size={48} ring />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-gold">Champion</div>
                <div className="font-semibold truncate">{t.champion.name}</div>
                <div className="text-xs text-muted truncate">{t.champion.teamName} · {t.champion.record}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted mt-3">{t.isComplete ? "Champion not recorded" : "Season underway"}</div>
          )}
          {t.titleGame && (
            <div className="text-xs text-muted mt-3">
              Title game {fmt(t.titleGame.winnerScore)} – {fmt(t.titleGame.loserScore)} vs {t.runnerUp?.name}{t.note ? " *" : ""}
            </div>
          )}
          <div className="mt-auto text-[11px] text-muted">Tap to flip for runner-up, sacko and top scorer</div>
        </div>
        <div className="absolute inset-0 card p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col gap-2 bg-surface-2">
          <div className="font-display text-2xl gold-text">{t.year} honors</div>
          <Row label="Runner-up" side={t.runnerUp} />
          <Row label="Third" side={t.third} />
          <Row label="Top scorer" side={t.topScorer} tone="text-cool" />
          <Row label="Best record" side={t.regSeasonChamp} tone="text-good" />
          <Row label="Sacko" side={t.lastPlace} tone="text-bad" />
          <Link href={`/seasons/${t.year}`} className="mt-auto text-xs text-gold hover:underline" onClick={(e) => e.stopPropagation()}>Full season →</Link>
        </div>
      </div>
    </button>
  );
}
