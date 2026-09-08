"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { OwnerLite, Trophy as TrophyT } from "@/lib/types";
import Trophy from "./Trophy";
import ChampionshipModal from "./ChampionshipModal";
import OwnerAvatar from "./OwnerAvatar";

export default function TrophyCase({ trophies, owners, order }: { trophies: TrophyT[]; owners: OwnerLite[]; order: string[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<TrophyT | null>(null);
  // newest title first
  const won = useMemo(() => trophies.filter((t) => t.champion).sort((a, b) => b.year - a.year), [trophies]);
  const champs = useMemo(() => {
    const keys = new Set(won.map((t) => t.champion!.ownerKey));
    const rank = new Map(order.map((k, i) => [k, i]));
    return owners.filter((o) => keys.has(o.key)).sort((a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99));
  }, [won, owners, order]);
  const latest = won.reduce((a, b) => (b.year > a.year ? b : a), won[0]);
  // shelves of up to 5 trophies
  const shelves: TrophyT[][] = [];
  for (let i = 0; i < won.length; i += 5) shelves.push(won.slice(i, i + 5));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setFilter(null)}
          className={clsx("rounded-full px-3 py-1 text-xs border transition-colors", !filter ? "border-gold text-gold bg-gold/10" : "border-border text-text-2 hover:border-gold/50")}
        >
          All champions
        </button>
        {champs.map((o) => {
          const n = won.filter((t) => t.champion!.ownerKey === o.key).length;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setFilter(filter === o.key ? null : o.key)}
              className={clsx("flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs border transition-colors", filter === o.key ? "border-gold text-gold bg-gold/10" : "border-border text-text-2 hover:border-gold/50")}
            >
              <OwnerAvatar owner={o} size={20} /> {o.name} <span className="text-muted">×{n}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gold/20 bg-linear-to-b from-[#141a2b] to-[#0a0d16] p-4 sm:p-8 shadow-[inset_0_0_80px_rgba(212,175,55,0.06)]">
        {shelves.map((row, si) => (
          <div key={si} className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 items-end pb-3">
              {row.map((t, i) => {
                const dim = !!filter && t.champion!.ownerKey !== filter;
                return (
                  <motion.button
                    key={t.year}
                    type="button"
                    onClick={() => setOpen(t)}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ delay: i * 0.06, duration: 0.45 }}
                    whileHover={dim ? {} : { y: -8, rotate: -1.5, scale: 1.04 }}
                    className={clsx("group relative flex flex-col items-center rounded-xl p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold", !dim && "cursor-pointer")}
                    aria-label={`${t.year} champion ${t.champion!.teamName} (${t.champion!.name}); click for roster`}
                    data-testid="trophy"
                  >
                    <Trophy year={t.year} line1={t.champion!.teamName} line2={t.champion!.name} size={150} glow={t.year === latest?.year && !dim} dim={dim} className="w-full h-auto max-w-[170px]" />
                    <div className={clsx("mt-2 text-center transition-opacity", dim && "opacity-30")}>
                      <div className="font-display text-lg leading-none gold-text">{t.year}</div>
                      <div className="text-[12px] text-text-2 leading-tight mt-0.5 line-clamp-1">{t.champion!.teamName}</div>
                      <div className="text-[11px] text-muted">({t.champion!.name})</div>
                    </div>
                    {t.year === latest?.year && !dim && (
                      <span className="absolute top-1 right-1 text-[9px] uppercase tracking-widest text-gold border border-gold/40 rounded-full px-1.5 py-0.5 bg-bg/70">Reigning</span>
                    )}
                    {/* shelf reflection */}
                    <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-gold/10 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                );
              })}
            </div>
            {/* glass shelf */}
            <div className="h-2 rounded-full bg-linear-to-r from-transparent via-gold/40 to-transparent shadow-[0_6px_18px_rgba(212,175,55,0.25)]" />
            <div className="h-6 bg-linear-to-b from-gold/8 to-transparent" />
          </div>
        ))}
        {!won.length && <p className="text-center text-muted text-sm py-10">No champions recorded yet.</p>}
      </div>
      <p className="text-xs text-muted mt-3">Click a trophy to see the championship roster and playoff run.</p>
      {open && <ChampionshipModal t={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
