import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "40px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "110px",
            fontWeight: "900",
            lineHeight: 1,
            letterSpacing: "-4px",
            fontFamily: "sans-serif",
          }}
        >
          P
        </span>
      </div>
    ),
    { ...size }
  );
}
