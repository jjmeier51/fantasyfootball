import Link from "next/link";
import clsx from "clsx";

export default function WeekPicker({ weeks, current, base }: { weeks: number[]; current: number; base: string }) {
  if (weeks.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {[...weeks].reverse().map((w) => (
        <Link
          key={w}
          href={w === weeks[weeks.length - 1] ? base : `${base}/${w}`}
          className={clsx("rounded-full px-3 py-1 text-xs font-medium border", w === current ? "border-gold/60 text-gold bg-gold/10" : "border-border text-text-2 hover:border-gold/40")}
        >
          Week {w}
        </Link>
      ))}
    </div>
  );
}
