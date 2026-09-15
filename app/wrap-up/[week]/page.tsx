import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecap, getWrapUp, recapWeeks } from "@/lib/data";
import WrapUpView from "@/components/weekly/WrapUpView";

export function generateStaticParams() {
  return recapWeeks.map((w) => ({ week: String(w) }));
}

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }): Promise<Metadata> {
  const { week } = await params;
  const wrap = getWrapUp(week);
  return { title: `Week ${week} Wrap Up`, description: wrap?.headline };
}

export default async function WrapUpWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const recap = getRecap(week);
  if (!recap) notFound();
  return <WrapUpView recap={recap} wrap={getWrapUp(week)} />;
}
