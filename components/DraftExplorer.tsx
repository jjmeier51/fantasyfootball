"use client";

import { useState } from "react";
import type { DraftPick } from "@/lib/types";
import DraftBoard from "./DraftBoard";

type SeasonDraft = { year: number; teamCount: number; picks: (DraftPick & { owner: string })[] };

export default function DraftExplorer({ drafts }: { drafts: SeasonDraft[] }) {
  const [year, setYear] = useState(drafts[0]?.year);
  const d = drafts.find((x) => x.year === year);
  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {drafts.map((x) => (
          <button key={x.year} type="button" onClick={() => setYear(x.year)} className={`rounded-full px-3 py-1 text-xs border ${x.year === year ? "border-gold text-gold bg-gold/10" : "border-border text-text-2 hover:border-gold/50"}`}>{x.year}</button>
        ))}
      </div>
      {d ? <DraftBoard picks={d.picks} teamCount={d.teamCount} /> : <p className="text-sm text-muted">No draft data.</p>}
    </div>
  );
}
