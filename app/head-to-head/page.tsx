import type { Metadata } from "next";
import { Suspense } from "react";
import { ownersLite, records } from "@/lib/data";
import H2HExplorer from "@/components/H2HExplorer";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Head-to-Head" };

export default function H2HPage() {
  return (
    <div>
      <PageHero eyebrow="Rivalries" title="Head-to-Head" sub="Pick two owners. Settle the argument." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <H2HExplorer owners={ownersLite} matrix={records.h2h.matrix} games={records.h2h.games} />
      </Suspense>
    </div>
  );
}
