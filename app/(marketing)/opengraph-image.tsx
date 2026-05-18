import { ImageResponse } from "next/og";

export const alt = "Ear Train — Learn music theory and play by ear";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, color: "#94a3b8" }}>Ear Train</div>
        <div
          style={{
            fontSize: 82,
            fontWeight: 700,
            lineHeight: 1.1,
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          Learn music theory and play by ear.
        </div>
        <div style={{ fontSize: 32, color: "#cbd5e1", marginTop: 28 }}>
          Lessons · ear training · spaced repetition · tools
        </div>
      </div>
    ),
    size,
  );
}
