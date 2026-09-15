import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { latestRecap, latestWrapUp, meta, ownerName, weekly } from "@/lib/data";
import type { WeekAward } from "@/lib/types";

export const alt = "Weekly Wrap Up";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const DISPLAY_FONT_URL = "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuDyYMZg.ttf";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(DISPLAY_FONT_URL);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Headshots live in public/, so read them from disk at build time and inline them. */
async function headshot(a: WeekAward | null | undefined): Promise<string | null> {
  if (!a?.headshot) return null;
  try {
    const buf = await readFile(path.join(process.cwd(), "public", a.headshot));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const recap = latestRecap;
  const wrap = latestWrapUp;
  const week = recap?.week ?? weekly.latestWeek ?? 1;
  const displayFont = await loadFont();
  const awards = [
    { label: "Player of the week", a: recap?.awards.playerOfWeek, color: "#34d399" },
    { label: "QB of the week", a: recap?.awards.qbOfWeek, color: "#34d399" },
    { label: "Difference maker", a: recap?.awards.differenceMaker, color: "#4f86e8" },
    { label: "Dud of the week", a: recap?.awards.dud, color: "#ef4444" },
  ];
  const shots = await Promise.all(awards.map((x) => headshot(x.a)));
  const hi = recap?.superlatives.highScore;
  const headline = wrap?.headline ?? `Week ${week} is in the books.`;
  const fontSize = headline.length > 90 ? 38 : headline.length > 70 ? 44 : 50;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "44px 64px 40px",
          background: "linear-gradient(180deg, #050608 0%, #101a2e 55%, #2b3038 100%)",
          color: "#f1f5f9",
          fontFamily: displayFont ? "Display" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, letterSpacing: 6, color: "#34d399", textTransform: "uppercase" }}>
            <div style={{ width: 54, height: 32, borderRadius: 27, background: "#162238", border: "2px solid #34d399", transform: "rotate(-30deg)" }} />
            {`Weekly Wrap Up · Week ${week} · ${weekly.year}`}
          </div>
          <div style={{ fontSize: 22, color: "#7f8a99", fontFamily: "Helvetica, Arial, sans-serif" }}>{meta.leagueName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize, fontWeight: 800, lineHeight: 1.12, letterSpacing: -1.5, color: "#f1f5f9" }}>{headline}</div>
          {hi && (
            <div style={{ fontSize: 26, color: "#b8c2cf", marginTop: 16, fontFamily: "Helvetica, Arial, sans-serif" }}>
              {`High score: ${ownerName(hi.ownerKey)} with ${hi.score.toFixed(2)} · ${recap?.games.length ?? 0} games · ${recap?.superlatives.avgScore?.toFixed(1)} per team`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          {awards.map((x, i) =>
            x.a ? (
              <div key={x.label} style={{ display: "flex", alignItems: "center", gap: 16, width: 529, padding: "10px 16px", borderRadius: 18, background: "rgba(16,26,46,0.85)", border: `2px solid ${x.color}55` }}>
                <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", background: "#162238", border: `2px solid ${x.color}`, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  {shots[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shots[i]!} alt="" width={72} height={72} style={{ width: 72, height: 72, objectFit: "cover", objectPosition: "top" }} />
                  ) : (
                    <div style={{ fontSize: 26, color: "#b8c2cf", marginBottom: 18 }}>{x.a.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2)}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", fontFamily: "Helvetica, Arial, sans-serif" }}>
                  <div style={{ fontSize: 13, letterSpacing: 2, color: x.color, textTransform: "uppercase" }}>{x.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 2 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", fontFamily: displayFont ? "Display" : "sans-serif" }}>{x.a.name}</div>
                    <div style={{ fontSize: 16, color: "#7f8a99" }}>{`${x.a.position} · ${x.a.proTeam}`}</div>
                  </div>
                  <div style={{ fontSize: 17, color: "#b8c2cf", marginTop: 1 }}>
                    {`${x.a.points.toFixed(1)} pts · started by ${x.a.ownerName} (${x.a.teamName})`}
                  </div>
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    ),
    { ...size, fonts: displayFont ? [{ name: "Display", data: displayFont, weight: 800, style: "normal" }] : [] },
  );
}
