/* ImageResponse renders raw image nodes; next/image cannot run in this renderer. */
/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/config/site";
export const alt = "Bizgenix AI CRM · A clear next step for every opportunity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const logo = site.logo
    ? site.logoFormat === "svg"
      ? `data:image/svg+xml;base64,${(await readFile(join(process.cwd(), "public/brand/bizgenix-logo.svg"))).toString("base64")}`
      : site.logoFormat === "png"
        ? `data:image/png;base64,${(await readFile(join(process.cwd(), "public/brand/bizgenix-logo.png"))).toString("base64")}`
        : `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "public/brand/bizgenix-logo.jpg"))).toString("base64")}`
    : null;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#e7f8e9",
        padding: 80,
        color: "#1f2a24",
      }}
    >
      {logo ? (
        <img src={logo} alt="Bizgenix AI" width={300} height={80} />
      ) : (
        <div style={{ display: "flex", fontSize: 30, color: "#2e7d52" }}>
          BIZGENIX AI CRM
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontSize: 72,
          letterSpacing: -3,
          lineHeight: 1.1,
          marginTop: 45,
        }}
      >
        Leads Are Coming In.
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 67,
          letterSpacing: -3,
          lineHeight: 1.1,
          color: "#2e7d52",
        }}
      >
        Are They Moving Forward?
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          marginTop: 35,
          color: "#5b6b62",
        }}
      >
        Your next sales opportunity deserves a clear next step.
      </div>
    </div>,
    size,
  );
}
