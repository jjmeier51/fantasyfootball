import type { Metadata } from "next";
import { ownersLite, records } from "@/lib/data";
import FactDeck from "@/components/FactDeck";
import { PageHero } from "@/components/ui";

export const metadata: Metadata = { title: "Fun Facts" };

export default function FunFactsPage() {
  return (
    <div>
      <PageHero eyebrow="Ammunition" title="Fun Facts" sub={`${records.funFacts.length} facts generated from the data, refreshed every sync. Shuffle, filter, copy, and send to the group chat.`} />
      <FactDeck facts={records.funFacts} owners={ownersLite} />
    </div>
  );
}
