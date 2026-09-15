import type { Metadata } from "next";
import { latestRecap, latestWrapUp, weekly } from "@/lib/data";
import { PageHero } from "@/components/ui";
import WrapUpView from "@/components/weekly/WrapUpView";

const title = latestRecap ? `Week ${latestRecap.week} Wrap Up` : "Weekly Wrap Up";
const description = latestWrapUp?.headline ?? "The week that was, around the NFL and inside the league.";

export const metadata: Metadata = {
  title: "Weekly Wrap Up",
  description,
  alternates: { canonical: "https://leagueofgangstars.com/wrap-up" },
  openGraph: { title: `${title} · ${weekly.year}`, description, url: "https://leagueofgangstars.com/wrap-up", type: "article" },
  twitter: { card: "summary_large_image", title: `${title} · ${weekly.year}`, description },
};

export default function WrapUpPage() {
  if (!latestRecap) {
    return <PageHero eyebrow={`${weekly.year} season`} title="Weekly Wrap Up" sub="No completed weeks yet. Check back after Week 1 wraps." />;
  }
  return <WrapUpView recap={latestRecap} wrap={latestWrapUp} />;
}
