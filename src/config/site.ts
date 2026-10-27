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
  schedulingProvider: env.SCHEDULING_PROVIDER,
  bookingDuration: env.BOOKING_DURATION_MINUTES,
  bookingHorizon: env.BOOKING_HORIZON_DAYS,
  bookingRules: {
    durationMinutes: env.BOOKING_DURATION_MINUTES,
    bufferMinutes: env.BOOKING_BUFFER_MINUTES,
    noticeMinutes: env.BOOKING_NOTICE_MINUTES,
    horizonDays: env.BOOKING_HORIZON_DAYS,
    startHour: env.BOOKING_START_HOUR,
    endHour: env.BOOKING_END_HOUR,
    weekdays: env.BOOKING_WEEKDAYS.split(",").map(Number),
  },
  gtmId: env.NEXT_PUBLIC_GTM_ID,
  logo:
    existsSync(join(process.cwd(), "public/brand/bizgenix-logo.svg")) ||
    existsSync(join(process.cwd(), "public/brand/bizgenix-logo.png")) ||
    existsSync(join(process.cwd(), "public/brand/bizgenix-logo.jpg")),
  logoFormat: existsSync(join(process.cwd(), "public/brand/bizgenix-logo.svg"))
    ? ("svg" as const)
    : existsSync(join(process.cwd(), "public/brand/bizgenix-logo.png"))
      ? ("png" as const)
      : existsSync(join(process.cwd(), "public/brand/bizgenix-logo.jpg"))
        ? ("jpg" as const)
        : null,
  dashboard: existsSync(join(process.cwd(), "public/product/dashboard.webp")),
  preview: !env.DATABASE_URL,
};
export type PublicSite = typeof site;
