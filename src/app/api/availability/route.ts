import { z } from "zod";
import { AppError } from "@/application/CreateOrUpdateLead";
import { container } from "@/composition/container";
import { handle, json } from "@/infrastructure/http";
import { googleScheduling } from "@/composition/google-calendar";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const query = z
      .object({ date: z.iso.date() })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (!(await container().availabilityLimiter.allowAvailability(ip)))
      throw new AppError(
        429,
        "Too many calendar checks. Please try again in a few minutes.",
      );
    const slots = await googleScheduling().availability(query.date);
    return json({ slots, timezone: "Asia/Kolkata" });
  });
}
