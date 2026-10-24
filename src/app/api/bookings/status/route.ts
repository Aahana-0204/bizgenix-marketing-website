import { container } from "@/composition/container";
import { handle, json } from "@/infrastructure/http";
import { verifyStatusToken } from "@/lib/security";
import { AppError } from "@/application/CreateOrUpdateLead";
export async function GET(request: Request) {
  return handle(async () => {
    const id = new URL(request.url).searchParams.get("leadId");
    const token =
      request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
    const services = container();
    const since =
      id && id.length <= 100
        ? verifyStatusToken(id, token, services.secret)
        : null;
    if (!id || !since) throw new AppError(404, "Booking not found.");
    const booking = await services.bookings.latest(id, since);
    return json(
      booking
        ? {
            status: booking.status,
            startAt: booking.startAt.toISOString(),
            timezone: booking.timezone,
            uid: booking.calBookingUid,
            meetingUrl: booking.meetingUrl,
          }
        : { status: "PENDING" },
    );
  });
}
