"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, Shuffle } from "lucide-react";
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
      <button
        type="button"
        onClick={shuffle}
        className="shrink-0 p-2 rounded-md text-muted hover:text-gold hover:bg-white/5"
        aria-label="Another fact"
        title="Another fact"
      >
        <Shuffle size={16} />
      </button>
    </div>
  );
}
