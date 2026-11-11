import { ImageResponse } from "next/og";

// Home-screen icon for iPhone and iPad: the logo on a solid background.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1013" }}>
        <div style={{ width: 132, height: 132, borderRadius: 66, background: "#b9a6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "#0f1013" }} />
        </div>
      </div>
    ),
    size,
  );
}
