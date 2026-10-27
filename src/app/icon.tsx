import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default async function Icon() {
  const iconPath = join(process.cwd(), "public/brand/bizgenix-icon.png");
  if (existsSync(iconPath)) {
    const iconData = await readFile(iconPath);
    return new Response(iconData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        background: "#2e7d52",
        color: "white",
        fontSize: 42,
        borderRadius: 13,
      }}
    >
      B
    </div>,
    size,
  );
}
