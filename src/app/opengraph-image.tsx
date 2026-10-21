import { ImageResponse } from "next/og";

export const alt = "Tapiz Boards OSS — Open Source Community Edition";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      width: "100%", height: "100%", padding: 72, background: "#111a1f",
      color: "#eff4f5", fontFamily: "sans-serif",
      backgroundImage: "linear-gradient(130deg, #111a1f 0%, #183740 65%, #0b5e66 100%)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", width: 84, height: 84, gap: 6,
          padding: 12, border: "3px solid #78b7bd", borderRadius: 12 }}>
          <div style={{ background: "#78b7bd", width: 24, height: 24 }} />
          <div style={{ background: "#499ba3", width: 24, height: 24 }} />
          <div style={{ background: "#499ba3", width: 24, height: 24 }} />
          <div style={{ background: "#78b7bd", width: 24, height: 24 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 42, fontWeight: 800 }}>Tapiz Boards</span>
          <span style={{ fontSize: 18, letterSpacing: 5, color: "#a7c9cf" }}>OSS / COMMUNITY EDITION</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 75, fontWeight: 800, lineHeight: 1.06, letterSpacing: -3 }}>Your board. Your server.</div>
        <div style={{ fontSize: 32, color: "#c4d3d7" }}>Open source Kanban, backlog and sprints.</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 22, color: "#78b7bd" }}>
        <span>MIT LICENSE</span><span>·</span><span>SELF-HOSTED</span><span>·</span><span>NO PLAN LIMITS</span>
      </div>
    </div>,
    size,
  );
}
