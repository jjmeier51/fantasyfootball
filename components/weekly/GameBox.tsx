import Link from "next/link";
import clsx from "clsx";
import type { WeekGame, WeekSide } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "@/components/OwnerAvatar";
import { Pill } from "@/components/ui";

function Side({ side, won, reverse }: { side: WeekSide; won: boolean; reverse?: boolean }) {
  return (
    <Link
      href={`/owners/${side.ownerKey}`}
      className={clsx("flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 min-w-0 flex-1 group text-center", reverse ? "sm:flex-row-reverse sm:text-right" : "sm:text-left", !won && "opacity-80")}
    >
      <OwnerAvatar owner={{ key: side.ownerKey, name: side.name }} logo={side.logo} size={44} ring={won} />
      <div className="min-w-0 w-full">
        <div className="font-semibold line-clamp-2 sm:line-clamp-none sm:truncate break-words group-hover:text-gold text-xs sm:text-base leading-tight">{side.teamName || side.name}</div>
        <div className="text-[11px] sm:text-xs text-muted truncate">{side.name}</div>
      </div>
    </Link>
  );
}

function Lineup({ side }: { side: WeekSide }) {
  return (
    <table className="w-full text-xs tabular">
      <tbody>
        {side.starters.map((p, i) => (
          <tr key={`${p.playerId ?? p.name}-${i}`} className="border-t border-border/60">
            <td className="py-1 pr-1 text-muted w-10">{p.slot}</td>
            <td className="py-1 pr-1 truncate max-w-[9rem] sm:max-w-none">
              <span className={clsx(side.topPlayer && p.name === side.topPlayer.name && p.points === side.topPlayer.points && "text-gold font-medium")}>{p.name}</span>
              <span className="text-muted"> {p.position}{p.position === "D/ST" ? "" : ` · ${p.proTeam}`}</span>
            </td>
            <td className={clsx("py-1 text-right font-medium", p.points <= 0 && "text-bad", p.projected != null && p.points >= p.projected * 1.5 && p.points >= 10 && "text-good")}>
              {fmt(p.points, 1)}
            </td>
            <td className="py-1 pl-2 text-right text-muted w-12 hidden sm:table-cell">{p.projected != null ? fmt(p.projected, 1) : "—"}</td>
          </tr>
        ))}
        <tr className="border-t border-border">
          <td className="pt-1.5 text-muted" colSpan={2}>Bench</td>
          <td className="pt-1.5 text-right text-muted">{fmt(side.benchPoints, 1)}</td>
          <td className="hidden sm:table-cell" />
        </tr>
      </tbody>
    </table>
  );
}

/** One matchup: scoreline, projected totals, both starting lineups, and the editorial blurb. */
export default function GameBox({ game, blurb, index }: { game: WeekGame; blurb?: string; index: number }) {
  const homeWon = game.winnerKey === game.home.ownerKey;
  const awayWon = game.winnerKey === game.away.ownerKey;
  const upset =
    game.home.projected != null && game.away.projected != null && game.winnerKey != null &&
    ((homeWon && game.home.projected < game.away.projected) || (awayWon && game.away.projected < game.home.projected));
  return (
    <article className="card overflow-hidden">
      <div className="p-3 sm:p-5 flex items-center gap-2 sm:gap-6">
        <Side side={game.home} won={homeWon} />
        <div className="text-center shrink-0">
          <div className="font-display text-2xl sm:text-3xl tabular leading-none whitespace-nowrap">
            <span className={clsx(homeWon ? "gold-text" : "text-text-2")}>{fmt(game.home.score)}</span>
            <span className="text-muted mx-2 text-lg">–</span>
            <span className={clsx(awayWon ? "gold-text" : "text-text-2")}>{fmt(game.away.score)}</span>
          </div>
          <div className="text-[10px] text-muted mt-1 whitespace-nowrap">
            proj {fmt(game.home.projected, 1)} – {fmt(game.away.projected, 1)}
          </div>
          <div className="mt-1.5 flex justify-center gap-1">
            {index === 0 && <Pill tone="gold">Game of the week</Pill>}
            {upset && <Pill tone="cool">Upset</Pill>}
          </div>
        </div>
        <Side side={game.away} won={awayWon} reverse />
      </div>
      {blurb && <p className="px-4 sm:px-5 pb-4 text-sm text-text-2 leading-relaxed border-t border-border pt-4">{blurb}</p>}
      <details className="border-t border-border group">
        <summary className="px-4 sm:px-5 py-2.5 text-xs text-muted cursor-pointer select-none hover:text-text list-none flex items-center justify-between">
          <span>Box score</span>
          <span className="group-open:hidden">Show</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <div className="px-4 sm:px-5 pb-4 grid md:grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted mb-1 truncate">{game.home.teamName || game.home.name}</div>
            <Lineup side={game.home} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted mb-1 truncate">{game.away.teamName || game.away.name}</div>
            <Lineup side={game.away} />
          </div>
        </div>
      </details>
    </article>
  );
}
