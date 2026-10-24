import { container } from "@/composition/container";
import { env } from "@/config/server";
import { handle, json } from "@/infrastructure/http";
import { safeEqual } from "@/lib/security";
import { AppError } from "@/application/CreateOrUpdateLead";
import { googleScheduling } from "@/composition/google-calendar";
import { reportFailure } from "@/infrastructure/logger";
export const runtime = "nodejs";
export const maxDuration = 60;
async function process(request: Request) {
  return handle(async () => {
    if (
      !env.CRON_SECRET ||
      !safeEqual(
        request.headers.get("authorization") || "",
        `Bearer ${env.CRON_SECRET}`,
      )
    )
      throw new AppError(401, "Unauthorized.");
    if (
      env.SCHEDULING_PROVIDER === "google" &&
      env.DATABASE_URL &&
      env.GOOGLE_CLIENT_ID
    ) {
      try {
        const recovery = await googleScheduling().reconcilePending();
        if (recovery.failed)
          reportFailure("GOOGLE_PENDING_BOOKING_RECOVERY_FAILED");
      } catch {
        reportFailure("GOOGLE_PENDING_BOOKING_RECOVERY_FAILED");
      }
    }
    return json(await container().outbox.execute());
  });
}
export const POST = process;
// Vercel Cron invokes GET; external schedulers can use POST.
export const GET = process;
