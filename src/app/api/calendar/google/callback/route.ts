import { cookies } from "next/headers";
import { z } from "zod";
import { googleSettings } from "@/composition/google-calendar";
import { database } from "@/infrastructure/prisma/client";
import {
  encryptRefreshToken,
  verifyOAuthState,
} from "@/infrastructure/google/security";
import { reportFailure } from "@/infrastructure/logger";
import { env } from "@/config/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const jar = await cookies();
  const nonce = jar.get("google-calendar-state")?.value || "";
  jar.set("google-calendar-state", "", {
    path: "/api/calendar/google",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure:
      new URL(env.NEXT_PUBLIC_SITE_URL || request.url).protocol === "https:",
  });
  const result = new URL(
    "/calendar/setup",
    env.NEXT_PUBLIC_SITE_URL || request.url,
  );
  result.searchParams.set("status", "failed");
  try {
    const config = googleSettings();
    const params = new URL(request.url).searchParams;
    const email = verifyOAuthState(
      params.get("state") || "",
      nonce,
      config.setupSecret,
    );
    const code = params.get("code");
    if (!email || !config.hosts.includes(email) || !code || params.has("error"))
      throw new Error("Invalid authorization");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
        grant_type: "authorization_code",
        code_verifier: nonce,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Token exchange failed");
    const tokens = z
      .object({
        access_token: z.string(),
        refresh_token: z.string(),
        scope: z.string(),
      })
      .parse(await response.json());
    const granted = new Set(tokens.scope.split(" "));
    if (
      ![
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.freebusy",
      ].every((scope) => granted.has(scope))
    )
      throw new Error("Required calendar access was not granted");
    const identity = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!identity.ok) throw new Error("Identity check failed");
    const account = z
      .object({ email: z.email(), email_verified: z.literal(true) })
      .parse(await identity.json());
    if (account.email.toLowerCase() !== email)
      throw new Error("Wrong Google account");
    const encryptedRefreshToken = encryptRefreshToken(
      tokens.refresh_token,
      config.tokenKey,
    );
    await database().googleCalendarConnection.upsert({
      where: { email },
      create: { email, encryptedRefreshToken },
      update: { encryptedRefreshToken, connectedAt: new Date() },
    });
    result.searchParams.set("status", "connected");
  } catch {
    reportFailure("GOOGLE_CALENDAR_CONNECTION_FAILED");
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: result.href,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
