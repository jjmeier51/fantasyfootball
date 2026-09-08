import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

export function SectionHeader({ eyebrow, title, sub, action, id }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode; id?: string }) {
  return (
    <div id={id} className="flex flex-wrap items-end justify-between gap-3 mb-5 scroll-mt-24">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="font-display text-2xl sm:text-3xl leading-tight">{title}</h2>
        {sub && <p className="text-sm text-text-2 mt-1 max-w-2xl">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHero({ eyebrow, title, sub, children }: { eyebrow?: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="pt-10 pb-8">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.05] gold-text">{title}</h1>
      {sub && <p className="text-text-2 mt-3 max-w-2xl text-base sm:text-lg">{sub}</p>}
      {children}
    </div>
  );
}

export function StatTile({ label, value, sub, accent, href }: { label: string; value: ReactNode; sub?: ReactNode; accent?: boolean; href?: string }) {
  const body = (
    <div className={clsx("card p-4 h-full", href && "card-hover")}>
      <div className="text-[11px] uppercase tracking-widest text-muted">{label}</div>
      <div className={clsx("font-display text-2xl sm:text-3xl leading-tight mt-2 tabular", accent && "gold-text")}>{value}</div>
      {sub && <div className="text-xs text-text-2 mt-1.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Pill({ children, tone = "default", className }: { children: ReactNode; tone?: "default" | "gold" | "good" | "bad" | "cool"; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
        tone === "default" && "border-border text-text-2",
        tone === "gold" && "border-gold/50 text-gold bg-gold/10",
        tone === "good" && "border-good/40 text-good bg-good/10",
        tone === "bad" && "border-bad/40 text-bad bg-bad/10",
        tone === "cool" && "border-cool/40 text-cool bg-cool/10",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CoverageNote({ tier, needs }: { tier: string; needs: string[] }) {
  if (tier === "full") return null;
  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 text-xs text-text-2 px-3 py-2">
      <span className="text-gold font-semibold">Partial data.</span> ESPN did not return everything for this season
      {needs.length ? `: ${needs.join("; ")}.` : "."} Records that depend on the missing pieces exclude it.
    </div>
  );
}
