"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Shuffle, ChevronRight } from "lucide-react";
import type { FunFact } from "@/lib/types";

export default function FunFactTicker({ facts, interval = 9000 }: { facts: FunFact[]; interval?: number }) {
  const order = useMemo(() => {
    // deterministic-but-random-looking shuffle per page load
    const arr = facts.map((f, i) => ({ f, r: Math.sin(i * 9301 + 49297) }));
    return arr.sort((a, b) => a.r - b.r).map((x) => x.f);
  }, [facts]);
  const [i, setI] = useState(0);
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (order.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % order.length), interval);
    return () => clearInterval(t);
  }, [order.length, interval]);
  const shuffle = () => {
    setSeed((s) => s + 1);
    setI(Math.floor(Math.random() * order.length));
  };
  const f = order[i];
  if (!f) return null;
  const body = (
    <span key={f.id + seed} className="ticker-in block text-base sm:text-lg text-text leading-snug">
      {f.text}
    </span>
  );
  return (
    <div className="card p-4 sm:p-5 flex items-start gap-3">
      <Sparkles className="text-gold shrink-0 mt-1" size={18} />
      <div className="flex-1 min-w-0">
        <div className="eyebrow mb-1">Did you know?</div>
        {f.href ? (
          <Link href={f.href} className="hover:text-gold-2">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1">
        <button
          type="button"
          onClick={shuffle}
          className="p-2 rounded-md text-muted hover:text-gold hover:bg-white/5"
          aria-label="Random fact"
          title="Random fact"
        >
          <Shuffle size={16} />
        </button>
        <button
          type="button"
          onClick={() => setI((v) => (v + 1) % order.length)}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-2 hover:border-gold/60 hover:text-gold"
          aria-label="Next fact"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
