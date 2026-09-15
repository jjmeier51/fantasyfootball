import Link from "next/link";
import clsx from "clsx";
import type { StandingRow } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";

export default function StandingsTable({ rows, playoffTeams, compact }: { rows: StandingRow[]; playoffTeams?: number | null; compact?: boolean }) {
  const cut = playoffTeams ?? 0;
  return (
    <div className="overflow-x-auto">
      <table className="data w-full">
        <thead>
          <tr>
            <th className="text-right w-8">#</th>
            <th>Team</th>
            <th className="text-right">W</th>
            <th className="text-right">L</th>
            {rows.some((r) => r.ties) && <th className="text-right">T</th>}
            <th className="text-right">PF</th>
            <th className="text-right">PA</th>
            {!compact && <th className="text-right hidden sm:table-cell">Diff</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.ownerKey} className={clsx(cut && r.rank === cut && "border-b-2 border-b-gold/40")}>
              <td className="text-right text-muted tabular">{r.rank}</td>
              <td>
                <Link href={`/owners/${r.ownerKey}`} className="flex items-center gap-2.5 min-w-0 group">
                  <OwnerAvatar owner={{ key: r.ownerKey, name: r.name }} logo={r.logo} size={28} />
                  <span className="min-w-0">
                    <span className="block font-medium truncate max-w-[11rem] sm:max-w-none group-hover:text-gold">{r.teamName || r.name}</span>
                    <span className="block text-[11px] text-muted truncate">{r.name}</span>
                  </span>
                </Link>
              </td>
              <td className="text-right tabular font-medium">{r.wins}</td>
              <td className="text-right tabular">{r.losses}</td>
              {rows.some((x) => x.ties) && <td className="text-right tabular">{r.ties}</td>}
              <td className="text-right tabular">{fmt(r.pointsFor)}</td>
              <td className="text-right tabular text-text-2">{fmt(r.pointsAgainst)}</td>
              {!compact && (
                <td className={clsx("text-right tabular hidden sm:table-cell", r.pointsFor - r.pointsAgainst >= 0 ? "text-good" : "text-bad")}>
                  {r.pointsFor - r.pointsAgainst >= 0 ? "+" : ""}{fmt(r.pointsFor - r.pointsAgainst, 1)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
