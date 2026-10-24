import { container } from "@/composition/container";
import { env } from "@/config/server";
import { handle, json } from "@/infrastructure/http";
import { safeEqual } from "@/lib/security";
import { AppError } from "@/application/CreateOrUpdateLead";
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
    return json(await container().outbox.execute());
  });
}
export const POST = process;
// Vercel Cron invokes GET; external schedulers can use POST.
export const GET = process;
