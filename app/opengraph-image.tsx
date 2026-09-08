import { ImageResponse } from "next/og";
import { completeSeasons, meta, records, reigningTrophy } from "@/lib/data";

export const alt = "League of Gangstars";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PLAYFAIR_URL = "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf";

async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(PLAYFAIR_URL);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const champs = new Set(records.trophies.filter((t) => t.champion).map((t) => t.champion!.ownerKey)).size;
  const playfair = await loadFont();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(160deg, #0f1420 0%, #090c14 60%, #141a2b 100%)",
          color: "#f2f4f8",
          fontFamily: playfair ? "Playfair" : "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, letterSpacing: 6, color: "#d4af37", textTransform: "uppercase" }}>
          <div style={{ width: 54, height: 32, borderRadius: 27, background: "#7a4319", border: "2px solid #d4af37", transform: "rotate(-30deg)" }} />
          Est. {meta.firstSeason} · Fantasy Football
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 108, fontWeight: 700, lineHeight: 1, color: "#e9c766" }}>{meta.leagueName}</div>
          <div style={{ fontSize: 30, color: "#b6bdcc", marginTop: 18, fontFamily: "Helvetica, Arial, sans-serif" }}>
            Every championship, every blowout, every embarrassing week. Preserved forever.
          </div>
        </div>
        <div style={{ display: "flex", gap: 48, fontFamily: "Helvetica, Arial, sans-serif" }}>
          {[
            [String(completeSeasons.length), "seasons"],
            [String(champs), "champions"],
            [meta.counts.games.toLocaleString(), "games"],
            [reigningTrophy?.champion?.name ?? "—", "reigning champ"],
          ].map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 44, fontWeight: 700, color: "#f2f4f8" }}>{v}</div>
              <div style={{ fontSize: 18, letterSpacing: 3, color: "#7e879b", textTransform: "uppercase" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: playfair ? [{ name: "Playfair", data: playfair, weight: 700, style: "normal" }] : [] },
  );
}
