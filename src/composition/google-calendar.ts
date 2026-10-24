import "server-only";
import { env } from "@/config/server";
import { database } from "@/infrastructure/prisma/client";
import { GoogleCalendar } from "@/infrastructure/google/calendar";
import { GoogleScheduling } from "@/application/GoogleScheduling";
import { AppError } from "@/application/CreateOrUpdateLead";

export function googleSettings() {
  if (
    env.SCHEDULING_PROVIDER !== "google" ||
    !env.DATABASE_URL ||
    !env.NEXT_PUBLIC_SITE_URL ||
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_CALENDAR_HOST_EMAILS ||
    !env.GOOGLE_CALENDAR_TOKEN_KEY ||
    !env.GOOGLE_CALENDAR_SETUP_SECRET ||
    !env.CRON_SECRET
  )
    throw new AppError(
      503,
      "Our booking calendar is being connected. Your details are saved. Please try again shortly.",
    );
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    createMeet: env.GOOGLE_CALENDAR_CREATE_MEET === "true",
    tokenKey: env.GOOGLE_CALENDAR_TOKEN_KEY,
    setupSecret: env.GOOGLE_CALENDAR_SETUP_SECRET,
    hosts: env.GOOGLE_CALENDAR_HOST_EMAILS.split(",").map((s) =>
      s.trim().toLowerCase(),
    ),
    redirectUri: new URL(
      "/api/calendar/google/callback",
      env.NEXT_PUBLIC_SITE_URL,
    ).href,
  };
}
export function googleScheduling() {
  const settings = googleSettings();
  return new GoogleScheduling(
    database(),
    new GoogleCalendar(settings),
    {
      durationMinutes: env.BOOKING_DURATION_MINUTES,
      bufferMinutes: env.BOOKING_BUFFER_MINUTES,
      noticeMinutes: env.BOOKING_NOTICE_MINUTES,
      horizonDays: env.BOOKING_HORIZON_DAYS,
      startHour: env.BOOKING_START_HOUR,
      endHour: env.BOOKING_END_HOUR,
      weekdays: env.BOOKING_WEEKDAYS.split(",").map(Number),
    },
    settings.hosts,
  );
}
