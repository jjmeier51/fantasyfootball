import Link from "next/link";
import clsx from "clsx";
import type { BestTeam, OwnerLite } from "@/lib/types";
import { fmt, ordinal, record } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";
import { Pill } from "./ui";

const RESULT: Record<BestTeam["result"], { label: string; tone: "gold" | "good" | "cool" | "default" | "bad" }> = {
  champion: { label: "Champion", tone: "gold" },
  runnerUp: { label: "Runner-up", tone: "good" },
  third: { label: "Third place", tone: "cool" },
  playoffs: { label: "Made playoffs", tone: "default" },
  missed: { label: "Missed playoffs", tone: "bad" },
};

export default function BestTeamCard({ team, owner }: { team: BestTeam; owner: OwnerLite }) {
  const hasLineup = team.roster.some((p) => p.starter !== null);
  const starters = hasLineup ? team.roster.filter((p) => p.starter) : team.roster;
  const bench = hasLineup ? team.roster.filter((p) => !p.starter) : [];
  return (
    <div className="card p-5 h-full flex flex-col">
      <div className="flex items-center gap-4">
        <OwnerAvatar owner={owner} logo={team.logo} size={56} ring />
        <div className="min-w-0 flex-1">
          <Link href={`/seasons/${team.year}`} className="font-display text-2xl leading-tight hover:text-gold block truncate">
            {team.year} {team.teamName}
          </Link>
          <div className="text-sm text-text-2 mt-0.5">
            {record(team.wins, team.losses, team.ties)} · {fmt(team.pointsFor, 1)} pts{team.seed ? ` · #${team.seed} seed` : ""}
            {team.finalRank ? ` · finished ${ordinal(team.finalRank)}` : ""}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Pill tone={RESULT[team.result].tone}>{RESULT[team.result].label}</Pill>
        <Pill tone="gold">#{team.rank} team-season all-time</Pill>
        <Pill>Score {team.score}</Pill>
      </div>
      <div className="mt-4 overflow-x-auto scrollbar-thin">
        <table className="data w-full text-sm">
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>NFL</th>
              <th className="text-right">Season pts</th>
            </tr>
          </thead>
          <tbody>
            {starters.map((p, i) => (
              <tr key={`${p.playerId}-${i}`}>
                <td className={clsx("font-medium", i === 0 && "text-gold-2")}>{p.name}</td>
                <td className="text-muted">{p.position}</td>
                <td className="text-muted">{p.proTeam}</td>
                <td className="text-right tabular">{p.seasonPoints != null ? fmt(p.seasonPoints, 1) : "—"}</td>
              </tr>
            ))}
            {bench.length > 0 && (
              <tr>
                <td colSpan={4} className="text-[10px] uppercase tracking-widest text-muted pt-3">Bench</td>
              </tr>
            )}
            {bench.map((p, i) => (
              <tr key={`b-${p.playerId}-${i}`}>
                <td className="text-text-2">{p.name}</td>
                <td className="text-muted">{p.position}</td>
                <td className="text-muted">{p.proTeam}</td>
                <td className="text-right tabular text-text-2">{p.seasonPoints != null ? fmt(p.seasonPoints, 1) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted mt-3">
        {hasLineup ? "Starters are the final lineup of that season; " : ""}season points are each player&rsquo;s full-season total. Ranked by win%, era-adjusted scoring and playoff result.
      </p>
    </div>
  );
}
