import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "96px",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: "280px",
            fontWeight: "900",
            lineHeight: 1,
            letterSpacing: "-12px",
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
