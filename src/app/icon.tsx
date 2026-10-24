/* ImageResponse renders raw image nodes; next/image cannot run in this renderer. */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default async function Icon() {
  if (site.logo) {
    const svg = await readFile(
      join(process.cwd(), "public/brand/bizgenix-logo.svg"),
    );
    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: 64,
          height: 64,
          background: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={`data:image/svg+xml;base64,${svg.toString("base64")}`}
          width={60}
          height={60}
          alt=""
        />
      </div>,
      size,
    );
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
