import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "./server";

export const site = {
  url: env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  production: env.APP_ENV === "production",
  getStartedUrl: env.NEXT_PUBLIC_GET_STARTED_URL,
  privacyUrl: env.NEXT_PUBLIC_PRIVACY_URL,
  termsUrl: env.NEXT_PUBLIC_TERMS_URL,
  contactEmail: env.NEXT_PUBLIC_CONTACT_EMAIL,
  contactPhone: env.NEXT_PUBLIC_CONTACT_PHONE,
  calLink: env.NEXT_PUBLIC_CALCOM_LINK,
  gtmId: env.NEXT_PUBLIC_GTM_ID,
  logo: existsSync(join(process.cwd(), "public/brand/bizgenix-logo.svg")),
  dashboard: existsSync(join(process.cwd(), "public/product/dashboard.webp")),
  preview: !env.DATABASE_URL,
};
export type PublicSite = typeof site;
