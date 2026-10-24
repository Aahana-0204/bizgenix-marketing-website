import { after } from "next/server";
import { container } from "@/composition/container";
import { env } from "@/config/server";
import { handle, json, readBody } from "@/infrastructure/http";
import { verifySignature } from "@/lib/security";
import { webhookSchema } from "@/shared/schemas";
import { AppError } from "@/application/CreateOrUpdateLead";
import { reportFailure } from "@/infrastructure/logger";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    if (!env.CALCOM_WEBHOOK_SECRET)
      throw new AppError(503, "Webhook is not configured.");
    const body = await readBody(request, 256000);
    if (
      !verifySignature(
        body,
        request.headers.get("x-cal-signature-256"),
        env.CALCOM_WEBHOOK_SECRET,
      )
    )
      throw new AppError(401, "Invalid signature.");
    let raw;
    try {
      raw = JSON.parse(body);
    } catch {
      throw new AppError(400, "Invalid payload.");
    }
    const event = webhookSchema.parse(raw);
    const services = container();
    await services.bookings.apply(event);
    after(async () => {
      try {
        await services.outbox.execute();
      } catch {
        reportFailure("WEBHOOK_OUTBOX_FAILED");
      }
    });
    return json({ received: true });
  });
}
