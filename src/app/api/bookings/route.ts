import { z } from "zod";
import { after } from "next/server";
import { handle, json, readJson } from "@/infrastructure/http";
import { authorizeScheduling } from "@/infrastructure/google/authorize-lead";
import { googleScheduling } from "@/composition/google-calendar";
import { reportFailure } from "@/infrastructure/logger";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  return handle(async () => {
    const input = z
      .object({
        leadId: z.string().min(1).max(100),
        startAt: z.iso.datetime(),
        presenter: z.email(),
      })
      .parse(await readJson(request));
    const { services, attempt } = await authorizeScheduling(
      request,
      input.leadId,
    );
    const booking = await googleScheduling().book(
      input.leadId,
      attempt,
      input.startAt,
      input.presenter,
    );
    after(async () => {
      try {
        await services.outbox.execute();
      } catch {
        reportFailure("GOOGLE_BOOKING_OUTBOX_FAILED");
      }
    });
    return json(booking);
  });
}
