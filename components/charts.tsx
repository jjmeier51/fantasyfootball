"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Finish } from "@/lib/types";

const GOLD = "#27a865";
const COOL = "#4f86e8";
const GRID = "rgba(127,138,153,0.18)";
const TICK = { fill: "#7e879b", fontSize: 11 };
const TIP = { background: "#101a2e", border: "1px solid #22314f", borderRadius: 8, fontSize: 12 };

export function FinishChart({ finishes, teamCount }: { finishes: Finish[]; teamCount: number }) {
  const data = finishes.filter((f) => f.rank).map((f) => ({ year: f.year, rank: f.rank, team: f.teamName, champion: f.champion }));
  if (data.length < 2) return <p className="text-sm text-muted">Not enough completed seasons for a chart.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis reversed domain={[1, teamCount]} allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={TIP}
          formatter={(v, _n, item) => [`${v}${(item as { payload?: { champion?: boolean } })?.payload?.champion ? " 🏆" : ""}`, "Finish"]}
          labelFormatter={(l, p) => `${l} · ${(p?.[0]?.payload as { team?: string })?.team ?? ""}`}
        />
        <ReferenceLine y={1} stroke={GOLD} strokeDasharray="3 3" />
        <Line type="monotone" dataKey="rank" stroke={GOLD} strokeWidth={2} dot={{ r: 4, fill: GOLD, stroke: "#101a2e", strokeWidth: 2 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PointsChart({ finishes }: { finishes: Finish[] }) {
  const data = finishes.filter((f) => f.pointsFor > 0).map((f) => ({ year: f.year, "Points for": f.pointsFor, "Points against": f.pointsAgainst }));
  if (data.length < 2) return <p className="text-sm text-muted">Not enough seasons for a chart.</p>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="year" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={TIP} formatter={(v) => (typeof v === "number" ? v.toFixed(1) : String(v))} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#b6bdcc" }} />
        <Bar dataKey="Points for" fill={GOLD} radius={[4, 4, 0, 0]} />
        <Bar dataKey="Points against" fill={COOL} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
