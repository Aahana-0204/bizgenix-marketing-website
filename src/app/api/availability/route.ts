import { z } from "zod";
import { handle, json } from "@/infrastructure/http";
import { authorizeScheduling } from "@/infrastructure/google/authorize-lead";
import { googleScheduling } from "@/composition/google-calendar";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return handle(async () => {
    const query = z
      .object({ leadId: z.string().min(1).max(100), date: z.iso.date() })
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    await authorizeScheduling(request, query.leadId);
    const slots = await googleScheduling().availability(query.date);
    return json({ slots, timezone: "Asia/Kolkata" });
  });
}
