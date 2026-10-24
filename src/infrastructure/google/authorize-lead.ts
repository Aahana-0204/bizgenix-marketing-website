import "server-only";
import { container } from "@/composition/container";
import { verifyStatusToken } from "@/lib/security";
import { AppError } from "@/application/CreateOrUpdateLead";

export async function authorizeScheduling(request: Request, leadId: string) {
  const services = container();
  const token =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  const issuedAt = verifyStatusToken(leadId, token, services.secret);
  if (!issuedAt)
    throw new AppError(
      401,
      "Your booking session has expired. Please submit your details again.",
    );
  const lead = await services.leads.find(leadId);
  if (!lead || lead.kind !== "DEMO_BOOKING")
    throw new AppError(404, "Enquiry not found.");
  return { services, attempt: issuedAt.toISOString() };
}
