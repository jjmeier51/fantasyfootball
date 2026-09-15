import type { Metadata } from "next";
import { latestRecap, latestWrapUp, weekly } from "@/lib/data";
import { PageHero } from "@/components/ui";
import WrapUpView from "@/components/weekly/WrapUpView";

export const metadata: Metadata = {
  title: "Weekly Wrap Up",
  description: latestWrapUp?.headline ?? "The week that was, around the NFL and inside the league.",
};

export default function WrapUpPage() {
  if (!latestRecap) {
    return <PageHero eyebrow={`${weekly.year} season`} title="Weekly Wrap Up" sub="No completed weeks yet. Check back after Week 1 wraps." />;
  }
  return <WrapUpView recap={latestRecap} wrap={latestWrapUp} />;
}
