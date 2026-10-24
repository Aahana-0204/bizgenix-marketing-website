import { createHash } from "node:crypto";
import { z } from "zod";
import { cookies } from "next/headers";
import { database } from "@/infrastructure/prisma/client";
import { handle, json, readJson } from "@/infrastructure/http";
import { authorizeCalendarSetup as authorize } from "@/infrastructure/google/authorize-setup";
import { oauthState } from "@/infrastructure/google/security";
import { AppError } from "@/application/CreateOrUpdateLead";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const config = authorize(request);
    const connections = await database().googleCalendarConnection.findMany({
      select: { email: true, connectedAt: true },
    });
    return json({
      hosts: config.hosts.map((email) => ({
        email,
        connected: connections.some((c) => c.email === email),
      })),
    });
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    const config = authorize(request);
    const { email } = z
      .object({ email: z.email().transform((s) => s.toLowerCase()) })
      .parse(await readJson(request));
    if (!config.hosts.includes(email))
      throw new AppError(403, "This account is not an approved demo host.");
    const { nonce, state } = oauthState(email, config.setupSecret);
    const jar = await cookies();
    jar.set("google-calendar-state", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(config.redirectUri).protocol === "https:",
      path: "/api/calendar/google",
      maxAge: 600,
    });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      login_hint: email,
      scope:
        "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy",
      state,
      code_challenge: createHash("sha256").update(nonce).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    return json({ url: url.href });
  });
}
