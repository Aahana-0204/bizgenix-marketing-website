import { after } from "next/server";
import { container } from "@/composition/container";
import { handle, json, readJson } from "@/infrastructure/http";
import { createStatusToken } from "@/lib/security";
import { reportFailure } from "@/infrastructure/logger";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handle(async () => {
    const services = container();
    const data = await readJson(request);
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    const lead = await services.createLead.execute(data, ip);
    after(async () => {
      try {
        await services.outbox.execute();
      } catch {
        reportFailure("IMMEDIATE_OUTBOX_FAILED");
      }
    });
    return json({
      leadId: lead.id,
      statusToken: createStatusToken(lead.id, services.secret),
      eventId: `lead:${lead.id}`,
      preview: !services.db,
    });
  });
}
