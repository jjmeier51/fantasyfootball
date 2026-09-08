"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { OwnerLite, RecordDef, RecordEntry } from "@/lib/types";
import type { MatchupDetail } from "@/lib/data";
import { fmt } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";
import MatchupModal from "./MatchupModal";

const TABS: { key: RecordDef["category"]; label: string }[] = [
  { key: "singleGame", label: "Single Game" },
  { key: "season", label: "Season" },
  { key: "career", label: "Career" },
  { key: "playoffs", label: "Playoffs" },
  { key: "streaks", label: "Streaks" },
  { key: "oddities", label: "Oddities" },
  { key: "waiver", label: "Waiver Wire" },
];

function valueLabel(r: RecordDef, e: RecordEntry) {
  switch (r.unit) {
    case "win%":
      return e.value >= 1 ? "1.000" : e.value.toFixed(3).replace(/^0/, "");
    case "seed":
      return `#${e.value}`;
    case "titles":
    case "wins":
    case "apps":
    case "sackos":
    case "games":
    case "seasons":
    case "weeks":
      return String(e.value);
    case "wins above expected":
    case "wins below expected":
      return (e.value > 0 ? "+" : "") + e.value.toFixed(2);
    case "margin":
      return fmt(e.value);
    case "ppg":
      return fmt(e.value, 1);
    default:
      return fmt(e.value, e.value > 1000 ? 1 : 2);
  }
}

function context(r: RecordDef, e: RecordEntry, owners: Map<string, OwnerLite>) {
  const opp = e.oppKey ? owners.get(e.oppKey)?.name ?? e.oppKey : null;
  if (e.player) return `${e.year} · ${e.teamName}${e.source === "rostered-weeks" && e.weeks ? ` · ${e.weeks} of ${e.totalWeeks} weeks` : ""}${e.qbRank ? ` · finished QB${e.qbRank}` : ""}`;
  if (r.category === "career") return `${e.seasons} seasons · ${e.record}`;
  if (r.category === "streaks") return e.endYear ? `${e.year} wk ${e.week} → ${e.endYear} wk ${e.endWeek}` : `${e.year}–${e.endYear ?? e.year}`;
  if (e.week) return `${e.year} · Week ${e.week}${opp ? ` · vs ${opp} (${fmt(e.oppScore)})` : ""}${e.isPlayoff ? " · Playoffs" : ""}`;
  if (e.year) return `${e.year}${e.teamName ? ` · ${e.teamName}` : ""}${e.record ? ` · ${e.record}` : ""}${e.champion ? " · 🏆" : ""}`;
  return "";
}

export default function RecordsBook({ records, owners, details }: { records: RecordDef[]; owners: OwnerLite[]; details: Record<string, MatchupDetail> }) {
  const [tab, setTab] = useState<RecordDef["category"]>("singleGame");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<MatchupDetail | null>(null);
  const omap = useMemo(() => new Map(owners.map((o) => [o.key, o])), [owners]);
  const list = records.filter((r) => r.category === tab);
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin border-b border-border mb-6" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            id={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx("px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors", tab === t.key ? "border-gold text-gold" : "border-transparent text-text-2 hover:text-text")}
          >
            {t.label} <span className="text-muted text-xs ml-1">{records.filter((r) => r.category === t.key).length}</span>
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {list.map((r) => {
          const showAll = expanded[r.id];
          const entries = showAll ? r.entries : r.entries.slice(0, 5);
          const top = r.keepOrder ? r.entries.reduce((a, b) => (b.value > a.value ? b : a), r.entries[0]) : r.entries[0];
          return (
            <div key={r.id} className="card p-4 flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl leading-none">{r.title}</h3>
                  {r.description && <p className="text-xs text-muted mt-1">{r.description}</p>}
                </div>
                {top && <div className="font-display text-3xl gold-text tabular shrink-0">{valueLabel(r, top)}</div>}
              </div>
              <ol className="mt-3 space-y-1.5">
                {entries.map((e, i) => {
                  const o = omap.get(e.ownerKey) ?? { key: e.ownerKey, name: e.ownerKey, color: null, logo: null };
                  const d = e.matchupId ? details[e.matchupId] : undefined;
                  const inner = e.player ? (
                    <>
                      <span className={clsx("font-display text-right shrink-0", r.keepOrder ? "text-sm w-11 text-gold" : clsx("text-lg w-6", i === 0 ? "text-gold" : "text-muted"))}>{r.keepOrder ? e.year : i + 1}</span>
                      {e.headshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.headshot} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover object-top bg-surface-2 ring-1 ring-border shrink-0" />
                      ) : (
                        <OwnerAvatar owner={o} size={32} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{e.player} <span className="text-muted text-xs font-normal">{e.position} · {e.proTeam}</span></span>
                        <span className="block text-[11px] text-muted truncate">
                          <Link href={`/owners/${e.ownerKey}`} className="text-text-2 hover:text-gold" onClick={(ev) => ev.stopPropagation()}>{o.name}</Link> · {context(r, e, omap)}
                        </span>
                      </span>
                      <span className={clsx("tabular text-sm font-semibold", i === 0 && !r.keepOrder && "text-gold-2")}>{valueLabel(r, e)}</span>
                    </>
                  ) : (
                    <>
                      <span className={clsx("font-display text-lg w-6 text-right", i === 0 ? "text-gold" : "text-muted")}>{i + 1}</span>
                      <OwnerAvatar owner={o} logo={e.logo ?? undefined} size={26} />
                      <span className="min-w-0 flex-1">
                        <Link href={`/owners/${e.ownerKey}`} className="font-medium hover:text-gold" onClick={(ev) => ev.stopPropagation()}>{o.name}</Link>
                        <span className="block text-[11px] text-muted truncate">{context(r, e, omap)}</span>
                      </span>
                      <span className={clsx("tabular text-sm font-semibold", i === 0 && "text-gold-2")}>{valueLabel(r, e)}</span>
                    </>
                  );
                  return (
                    <li key={i}>
                      {d ? (
                        <button type="button" onClick={() => setOpen(d)} className="w-full flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-white/5 text-left" title="View matchup">
                          {inner}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 px-1.5 py-1">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {r.entries.length > 5 && (
                <button type="button" onClick={() => setExpanded((x) => ({ ...x, [r.id]: !showAll }))} className="mt-2 text-xs text-gold hover:underline self-start">
                  {showAll ? "Show top 5" : `Show top ${r.entries.length}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {open && <MatchupModal m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
