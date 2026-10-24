import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { existsSync } from "node:fs";
import { parseEnv } from "./src/config/env";
const env = parseEnv(process.env);
if (
  env.APP_ENV === "production" &&
  !existsSync("public/brand/bizgenix-logo.svg")
)
  throw new Error(
    "Add the approved official SVG at public/brand/bizgenix-logo.svg before production",
  );
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://app.cal.com https://cal.com https://connect.facebook.net" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://*.google.com https://*.google.co.in https://*.doubleclick.net",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.google.com https://*.google.co.in https://*.doubleclick.net https://*.sentry.io https://*.sentry-cdn.com https://www.facebook.com https://connect.facebook.net https://cal.com https://*.cal.com" +
    (process.env.NODE_ENV === "development" ? " ws: wss:" : ""),
  "frame-src https://cal.com https://*.cal.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const config: NextConfig = {
  serverExternalPackages: ["pino", "@prisma/client"],
  turbopack: {
    root: process.cwd(),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...(env.APP_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
              ]
            : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
        ],
      },
    ];
  },
};
export default env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(config, {
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      authToken: env.SENTRY_AUTH_TOKEN,
      silent: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : config;
