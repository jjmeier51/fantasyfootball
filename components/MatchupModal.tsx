"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import type { MatchupDetail, MatchupDetailSide } from "@/lib/data";
import { fmt, matchupTypeLabel } from "@/lib/format";
import OwnerAvatar from "./OwnerAvatar";

export function Modal({ onClose, children, title }: { onClose: () => void; children: React.ReactNode; title?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ height: "100dvh" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full sm:max-w-3xl flex flex-col overflow-hidden rounded-b-none sm:rounded-2xl"
        style={{ maxHeight: "calc(100dvh - max(2.5rem, env(safe-area-inset-top)) - env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface/95">
          <div className="min-w-0">{title}</div>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-md hover:bg-white/10" aria-label="Close" data-testid="modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin flex-1 min-h-0">{children}</div>
        <div className="shrink-0 sm:hidden border-t border-border p-3 bg-surface" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={onClose} className="w-full rounded-full border border-border py-2.5 text-sm font-semibold text-text-2 hover:text-text hover:border-gold/60">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Side({ s, align }: { s: MatchupDetailSide; align: "left" | "right" }) {
  return (
    <div className={clsx("flex-1 min-w-0", align === "right" && "text-right")}>
      <div className={clsx("flex items-center gap-3", align === "right" && "flex-row-reverse")}>
        <OwnerAvatar owner={{ key: s.ownerKey, name: s.name }} logo={s.logo} size={44} ring={s.won} />
        <div className="min-w-0">
          <Link href={`/owners/${s.ownerKey}`} className="font-semibold hover:text-gold block truncate">{s.name}</Link>
          <div className="text-xs text-muted truncate">{s.teamName}</div>
        </div>
      </div>
      <div className={clsx("font-display text-5xl mt-2 tabular", s.won ? "gold-text" : "text-text-2")}>{fmt(s.score)}</div>
    </div>
  );
}

export default function MatchupModal({ m, onClose }: { m: MatchupDetail; onClose: () => void }) {
  const hasStarters = m.home.starters.length || m.away.starters.length;
  return (
    <Modal
      onClose={onClose}
      title={
        <div className="text-sm">
          <Link href={`/seasons/${m.year}`} className="font-display text-xl text-gold">{m.year}</Link>
          <span className="text-muted"> · Week {m.week} · {matchupTypeLabel(m.type)}</span>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <Side s={m.home} align="left" />
        <div className="font-display text-2xl text-muted pt-14">vs</div>
        <Side s={m.away} align="right" />
      </div>
      <div className="text-xs text-muted mt-2 text-center">
        Margin {fmt(Math.abs(m.home.score - m.away.score))} · Combined {fmt(m.home.score + m.away.score)}
      </div>
      {hasStarters ? (
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {[m.home, m.away].map((s) => (
            <div key={s.ownerKey}>
              <div className="eyebrow mb-2">{s.name}&rsquo;s starters</div>
              <table className="data w-full text-sm">
                <tbody>
                  {s.starters.map((p, i) => (
                    <tr key={i}>
                      <td className="text-muted text-xs w-10">{p.slot}</td>
                      <td className="truncate max-w-[10rem]">{p.name} <span className="text-muted text-xs">{p.proTeam}</span></td>
                      <td className="text-right tabular">{fmt(p.points, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted mt-6 text-center">Player-level box scores are only available from ESPN for 2019 onward.</p>
      )}
    </Modal>
  );
}
