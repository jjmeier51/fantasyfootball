import Link from "next/link";
import clsx from "clsx";
import type { Matchup, Season } from "@/lib/types";
import { fmt } from "@/lib/format";

/** Playoff bracket rendered from WINNERS_BRACKET matchups, grouped by week into rounds. */
export default function Bracket({ season, nameOf }: { season: Season; nameOf: (k: string) => string }) {
  const games = season.matchups.filter((m) => m.type === "WINNERS_BRACKET");
  if (!games.length) return <p className="text-sm text-muted">No playoff bracket recorded for this season.</p>;
  const weeks = [...new Set(games.map((m) => m.week))].sort((a, b) => a - b);
  const roundName = (i: number) => {
    const fromEnd = weeks.length - 1 - i;
    return fromEnd === 0 ? "Championship" : fromEnd === 1 ? "Semifinals" : fromEnd === 2 ? "Quarterfinals" : `Round ${i + 1}`;
  };
  const seedOf = (k: string) => season.teams.find((t) => t.ownerKey === k)?.seed;
  const Team = ({ m, side }: { m: Matchup; side: "home" | "away" }) => {
    const s = m[side];
    const won = m.decided && m.winnerKey === s.ownerKey;
    return (
      <div className={clsx("flex items-center gap-2 px-3 py-1.5", won ? "bg-gold/10 text-text" : "text-text-2")}>
        <span className="text-[10px] text-muted w-4">{seedOf(s.ownerKey) ? `#${seedOf(s.ownerKey)}` : ""}</span>
        <Link href={`/owners/${s.ownerKey}`} className={clsx("flex-1 truncate text-sm hover:text-gold", won && "font-semibold")}>{nameOf(s.ownerKey)}</Link>
        <span className={clsx("tabular text-sm", won && "text-gold-2 font-semibold")}>{m.decided ? fmt(s.score) : "—"}</span>
      </div>
    );
  };
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="flex gap-6 min-w-max items-stretch">
        {weeks.map((w, i) => (
          <div key={w} className="flex flex-col justify-around gap-4 w-60">
            <div className="text-[10px] uppercase tracking-widest text-muted text-center">{roundName(i)} · Week {w}</div>
            {games.filter((m) => m.week === w).map((m) => (
              <div key={m.id} className={clsx("card overflow-hidden divide-y divide-border", i === weeks.length - 1 && "border-gold/50 shadow-[0_0_30px_-10px_rgba(52,211,153,0.5)]")}>
                <Team m={m} side="home" />
                <Team m={m} side="away" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
