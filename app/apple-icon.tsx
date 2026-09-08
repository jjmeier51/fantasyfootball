import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen / iMessage icon: a football on the site's navy. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, #101a2e, #07090d)" }}>
        <div style={{ width: 120, height: 72, borderRadius: 60, background: "#1b2a48", border: "5px solid #34d399", transform: "rotate(-30deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 52, height: 5, background: "#b8c2cf", borderRadius: 3 }} />
        </div>
      </div>
    ),
    { ...size },
  );
}
