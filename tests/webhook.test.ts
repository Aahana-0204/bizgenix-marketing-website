import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { bookingStatus } from "@/domain/booking";
import { webhookSchema } from "@/shared/schemas";
const { apply } = vi.hoisted(() => ({ apply: vi.fn() }));
vi.mock("@/config/server", () => ({
  env: { CALCOM_WEBHOOK_SECRET: "test-webhook-secret" },
}));
vi.mock("@/composition/container", () => ({
  container: () => ({ bookings: { apply }, outbox: { execute: vi.fn() } }),
}));
vi.mock("@/infrastructure/logger", () => ({ reportFailure: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
import { POST } from "@/app/api/webhooks/calcom/route";
const base = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: "2026-10-23T10:00:00.000Z",
  payload: {
    uid: "booking-test",
    startTime: "2026-10-24T10:00:00.000Z",
    endTime: "2026-10-24T10:20:00.000Z",
    attendees: [{ email: "test@example.test" }],
  },
};
beforeEach(() => vi.clearAllMocks());
describe("booking lifecycle", () => {
  it("does not treat a requested booking as confirmed", () =>
    expect(
      bookingStatus(
        webhookSchema.parse({ ...base, triggerEvent: "BOOKING_REQUESTED" }),
      ),
    ).toBe("PENDING"));
  it("accepts explicit confirmation even if the event type requires approval", () =>
    expect(
      bookingStatus(
        webhookSchema.parse({
          ...base,
          triggerEvent: "BOOKING_CONFIRMED",
          payload: { ...base.payload, requiresConfirmation: true },
        }),
      ),
    ).toBe("CONFIRMED"));
  it.each([
    ["BOOKING_CANCELLED", "CANCELLED"],
    ["BOOKING_RESCHEDULED", "RESCHEDULED"],
    ["BOOKING_CREATED", "CONFIRMED"],
  ])("maps %s", (trigger, status) =>
    expect(
      bookingStatus(webhookSchema.parse({ ...base, triggerEvent: trigger })),
    ).toBe(status),
  );
});
describe("webhook transport", () => {
  it("rejects a forged request before touching persistence", async () => {
    const response = await POST(
      new Request("https://example.test/api/webhooks/calcom", {
        method: "POST",
        body: JSON.stringify(base),
        headers: { "x-cal-signature-256": "invalid" },
      }),
    );
    expect(response.status).toBe(401);
    expect(apply).not.toHaveBeenCalled();
  });
  it("accepts a signed valid event", async () => {
    const body = JSON.stringify(base),
      signature = createHmac("sha256", "test-webhook-secret")
        .update(body)
        .digest("hex");
    const response = await POST(
      new Request("https://example.test/api/webhooks/calcom", {
        method: "POST",
        body,
        headers: { "x-cal-signature-256": signature },
      }),
    );
    expect(response.status).toBe(200);
    expect(apply).toHaveBeenCalledOnce();
  });
});
