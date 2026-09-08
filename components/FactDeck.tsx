"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Copy, Check, ArrowRight } from "lucide-react";
import clsx from "clsx";
import type { FunFact, OwnerLite } from "@/lib/types";
import OwnerAvatar from "./OwnerAvatar";

const CATS: Record<string, string> = { all: "All", trophies: "Trophies", records: "Records", rivalries: "Rivalries", draft: "Draft", streaks: "Streaks", oddities: "Oddities", league: "League" };

export default function FactDeck({ facts, owners }: { facts: FunFact[]; owners: OwnerLite[] }) {
  const [cat, setCat] = useState("all");
  const [seed, setSeed] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const omap = useMemo(() => new Map(owners.map((o) => [o.key, o])), [owners]);
  const list = useMemo(() => {
    const f = facts.filter((x) => cat === "all" || x.category === cat);
    // seeded shuffle (pure hash per index so re-renders are stable)
    const hash = (i: number) => {
      const v = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    return f.map((x, i) => ({ x, r: hash(i) })).sort((a, b) => a.r - b.r).map((a) => a.x);
  }, [facts, cat, seed]);
  const copy = async (f: FunFact) => {
    try {
      await navigator.clipboard.writeText(`${f.text} — leagueofgangstars.com`);
      setCopied(f.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {Object.entries(CATS).filter(([k]) => k === "all" || facts.some((f) => f.category === k)).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setCat(k)} className={clsx("rounded-full px-3 py-1 text-xs border", cat === k ? "border-gold text-gold bg-gold/10" : "border-border text-text-2 hover:border-gold/50")}>
            {label} <span className="text-muted">{k === "all" ? facts.length : facts.filter((f) => f.category === k).length}</span>
          </button>
        ))}
        <button type="button" onClick={() => setSeed((s) => s + 1)} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold text-bg text-xs font-semibold px-3 py-1.5 hover:bg-gold-2"><Shuffle size={14} /> Shuffle</button>
      </div>
      <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AnimatePresence>
          {list.map((f, i) => {
            const o = f.ownerKey ? omap.get(f.ownerKey) : undefined;
            return (
              <motion.div key={f.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="card p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  {o ? <OwnerAvatar owner={o} size={28} /> : <span className="w-7 h-7 rounded-full bg-gold/15 flex items-center justify-center text-gold text-xs">★</span>}
                  <span className="text-[10px] uppercase tracking-widest text-muted">{CATS[f.category] ?? f.category}{f.year ? ` · ${f.year}` : ""}</span>
                </div>
                <p className="text-sm leading-relaxed flex-1">{f.text}</p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  {f.href && <Link href={f.href} className="inline-flex items-center gap-1 text-gold hover:underline">See it <ArrowRight size={12} /></Link>}
                  <button type="button" onClick={() => copy(f)} className="ml-auto inline-flex items-center gap-1 text-muted hover:text-text">{copied === f.id ? <Check size={12} /> : <Copy size={12} />} {copied === f.id ? "Copied" : "Copy"}</button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
