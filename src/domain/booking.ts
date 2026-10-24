import type { CalEvent } from "@/shared/schemas";
/** Provider confirmation overrides an event type's requiresConfirmation setting. */
export function bookingStatus(
  event: CalEvent,
): "PENDING" | "CONFIRMED" | "RESCHEDULED" | "CANCELLED" {
  if (event.triggerEvent === "BOOKING_CANCELLED") return "CANCELLED";
  if (event.triggerEvent === "BOOKING_CONFIRMED") return "CONFIRMED";
  if (
    event.triggerEvent === "BOOKING_REQUESTED" ||
    event.payload.requiresConfirmation ||
    event.payload.status === "PENDING"
  )
    return "PENDING";
  return event.triggerEvent === "BOOKING_RESCHEDULED"
    ? "RESCHEDULED"
    : "CONFIRMED";
}
