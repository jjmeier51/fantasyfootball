"use client";

import Link from "next/link";
import type { Trophy as TrophyT } from "@/lib/types";
import { fmt } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";
import Trophy from "./Trophy";
import { Modal } from "./MatchupModal";
import { Pill } from "./ui";

const SLOT_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "RB/WR", "RB/WR/TE", "WR/TE", "OP", "D/ST", "K", "BE", "IR", ""];

export default function ChampionshipModal({ t, onClose }: { t: TrophyT; onClose: () => void }) {
  const c = t.champion!;
  const roster = [...(t.roster ?? [])].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a.slot ?? "");
    const bi = SLOT_ORDER.indexOf(b.slot ?? "");
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (b.seasonPoints ?? b.points ?? 0) - (a.seasonPoints ?? a.points ?? 0);
  });
  const hasSlots = roster.some((p) => p.slot);
  const starters = hasSlots ? roster.filter((p) => p.slot && p.slot !== "BE" && p.slot !== "IR") : roster;
  const bench = hasSlots ? roster.filter((p) => p.slot === "BE" || p.slot === "IR") : [];
  const sourceLabel =
    t.rosterSource === "title-week" ? "Championship-game lineup" : t.rosterSource === "final-roster" ? "End-of-season roster" : t.rosterSource === "override" ? "Roster from league records" : "";
  return (
    <Modal
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl gold-text">{t.year} Champion</span>
          <span className="text-sm text-muted truncate">{c.teamName}</span>
        </div>
      }
    >
      <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
        <div className="mx-auto">
          <Trophy year={t.year} line1={c.teamName} line2={c.name} size={170} glow />
        </div>
        <div>
          <div className="flex items-center gap-3">
            <OwnerAvatar owner={{ key: c.ownerKey, name: c.name }} logo={c.logo} size={56} ring />
            <div>
              <Link href={`/owners/${c.ownerKey}`} className="font-display text-3xl hover:text-gold leading-none">{c.name}</Link>
              <div className="text-text-2">{c.teamName}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {c.record && <Pill tone="gold">Regular season {c.record}</Pill>}
            {c.seed ? <Pill>#{c.seed} seed</Pill> : null}
            {c.pointsFor != null && <Pill>{fmt(c.pointsFor, 1)} pts</Pill>}
          </div>
          {t.playoffRun.length > 0 && (
            <div className="mt-5">
              <div className="eyebrow mb-2">Playoff run</div>
              <ul className="space-y-1 text-sm">
                {t.playoffRun.map((g) => (
                  <li key={g.matchupId} className="flex items-center justify-between gap-3 border-b border-border/60 pb-1 last:border-0">
                    <span className="text-muted text-xs w-14">Week {g.week}</span>
                    <span className="flex-1">
                      {(g.won ?? g.score > g.oppScore) ? "def." : "lost to"} <Link href={`/owners/${g.oppKey}`} className="hover:text-gold">{g.oppName}</Link>
                      {g.won && g.score < g.oppScore && <span className="text-muted text-xs"> (by ruling)</span>}
                    </span>
                    <span className="tabular font-display text-lg">{fmt(g.score)} – {fmt(g.oppScore)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {t.note && (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-text-2">
              <span className="text-gold font-semibold">Commissioner&rsquo;s note.</span> {t.note}
            </div>
          )}
          {t.runnerUp && (
            <div className="mt-4 text-xs text-muted">
              Runner-up: <Link href={`/owners/${t.runnerUp.ownerKey}`} className="text-text-2 hover:text-gold">{t.runnerUp.name}</Link> ({t.runnerUp.teamName})
              {t.third && <> · Third: <Link href={`/owners/${t.third.ownerKey}`} className="text-text-2 hover:text-gold">{t.third.name}</Link></>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">Championship roster</div>
          {sourceLabel && <div className="text-[11px] text-muted">{sourceLabel}</div>}
        </div>
        {roster.length ? (
          <div className="grid md:grid-cols-2 gap-4 mt-2">
            <table className="data w-full text-sm">
              <thead>
                <tr>
                  {hasSlots && <th>Slot</th>}
                  <th>Player</th>
                  <th>Pos</th>
                  <th>NFL</th>
                  {roster.some((p) => p.points != null) && <th className="text-right">Title game</th>}
                  {roster.some((p) => p.seasonPoints != null) && <th className="text-right">Season</th>}
                </tr>
              </thead>
              <tbody>
                {starters.map((p, i) => (
                  <tr key={i}>
                    {hasSlots && <td className="text-muted text-xs">{p.slot}</td>}
                    <td className="font-medium">{p.name}</td>
                    <td className="text-muted">{p.position}</td>
                    <td className="text-muted">{p.proTeam}</td>
                    {roster.some((q) => q.points != null) && <td className="text-right tabular">{p.points != null ? fmt(p.points, 1) : "—"}</td>}
                    {roster.some((q) => q.seasonPoints != null) && <td className="text-right tabular text-text-2">{p.seasonPoints != null ? fmt(p.seasonPoints, 1) : "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {bench.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted mb-1">Bench</div>
                <table className="data w-full text-sm">
                  <tbody>
                    {bench.map((p, i) => (
                      <tr key={i}>
                        <td className="text-muted text-xs">{p.slot}</td>
                        <td>{p.name}</td>
                        <td className="text-muted">{p.position}</td>
                        <td className="text-muted">{p.proTeam}</td>
                        <td className="text-right tabular text-text-2">{p.points != null ? fmt(p.points, 1) : p.seasonPoints != null ? fmt(p.seasonPoints, 1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted mt-2">
            Roster not available for this season. ESPN keeps rosters only for recent years; add a <code className="text-xs">champion_roster</code> to <code className="text-xs">sync/overrides/{t.year}.yml</code> from a screenshot to fill it in.
          </p>
        )}
      </div>
    </Modal>
  );
}
