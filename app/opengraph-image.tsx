import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Streamer Times - Your Livestream Guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0F",
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(0,240,255,0.08) 0%, transparent 60%)",
        }}
      >
        {/* Corner brackets */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            width: 40,
            height: 40,
            borderTop: "3px solid rgba(0,240,255,0.5)",
            borderLeft: "3px solid rgba(0,240,255,0.5)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 60,
            width: 40,
            height: 40,
            borderTop: "3px solid rgba(0,240,255,0.5)",
            borderRight: "3px solid rgba(0,240,255,0.5)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 60,
            width: 40,
            height: 40,
            borderBottom: "3px solid rgba(0,240,255,0.5)",
            borderLeft: "3px solid rgba(0,240,255,0.5)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            width: 40,
            height: 40,
            borderBottom: "3px solid rgba(0,240,255,0.5)",
            borderRight: "3px solid rgba(0,240,255,0.5)",
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          StreamerTimes
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#A0A0B0",
            marginTop: 16,
            display: "flex",
          }}
        >
          Your Livestream Guide
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(0,240,255,0.3)",
              backgroundColor: "rgba(0,240,255,0.08)",
              color: "#00F0FF",
              fontSize: 18,
            }}
          >
            AI Predictions
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(0,255,136,0.3)",
              backgroundColor: "rgba(0,255,136,0.08)",
              color: "#00FF88",
              fontSize: 18,
            }}
          >
            Real-Time Alerts
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(145,70,255,0.3)",
              backgroundColor: "rgba(145,70,255,0.08)",
              color: "#9146FF",
              fontSize: 18,
            }}
          >
            Twitch + YouTube
          </div>
        </div>

        {/* Platform badges */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 40,
            fontSize: 16,
            color: "#7A7A90",
          }}
        >
          <div style={{ display: "flex" }}>Free on iOS & Android</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
