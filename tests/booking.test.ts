import { describe, expect, it, vi } from "vitest";
import { BookingService } from "@/server/services/BookingService";
import { BusinessHoursPolicy } from "@/server/policies/BusinessHoursPolicy";
import { AvailabilityService } from "@/server/services/AvailabilityService";
import { SlotGenerator } from "@/server/services/SlotGenerator";
import { SlotUnavailableError, ValidationError } from "@/server/domain/errors";
import { bookingSchema, dateSchema, type BookingInput } from "@/shared/schemas";
import type { BookingRecord, IBookingRepository } from "@/server/interfaces";
const clock = { now: () => new Date("2026-10-21T00:00:00Z") };
const input: BookingInput = { companyName: "Example", fullName: "Test Person", email: "test@example.com", mobile: "+919876543210", interest: "CRM", message: "Please review our process", website: "", slotStart: "2026-10-22T10:00:00+05:30" };
class FakeRepository implements IBookingRepository {
  readonly rows = new Map<string, BookingRecord>();
  async create(data: BookingInput, end: Date) { const start = new Date(data.slotStart); const key = start.toISOString(); if (this.rows.has(key)) throw new SlotUnavailableError(); const record = { ...data, id: "test-id", slotStart: start, slotEnd: end }; this.rows.set(key, record); return record; }
  async taken(from: Date, to: Date) { return [...this.rows.values()].filter(row => row.slotStart >= from && row.slotStart < to).map(row => row.slotStart); }
}
describe("BookingService", () => {
  it("stores a validated half-hour booking and sends a confirmation", async () => { const repo = new FakeRepository(); const sendConfirmation = vi.fn().mockResolvedValue(true); const service = new BookingService(repo, { sendConfirmation }, clock, new BusinessHoursPolicy(), 3); const result = await service.book(input); expect(result.slotEnd).toBe("2026-10-22T05:00:00.000Z"); expect(result.emailSent).toBe(true); expect(sendConfirmation).toHaveBeenCalledOnce(); });
  it("keeps the booking saved if email delivery throws", async () => { const repo = new FakeRepository(); const service = new BookingService(repo, { sendConfirmation: async () => { throw new Error("mail unavailable"); } }, clock, new BusinessHoursPolicy(), 3); const result = await service.book(input); expect(result.emailSent).toBe(false); expect(repo.rows.size).toBe(1); });
  it("rejects invalid input and a filled honeypot before writing", async () => { const repo = new FakeRepository(); const service = new BookingService(repo, { sendConfirmation: async () => true }, clock, new BusinessHoursPolicy(), 3); await expect(service.book({ ...input, website: "spam" })).rejects.toThrow(); await expect(service.book({ ...input, mobile: "123" })).rejects.toThrow(); expect(repo.rows.size).toBe(0); });
  it("preserves the repository conflict for 19 of 20 competing calls", async () => { const repo = new FakeRepository(); const service = new BookingService(repo, { sendConfirmation: async () => true }, clock, new BusinessHoursPolicy(), 3); const results = await Promise.allSettled(Array.from({ length: 20 }, () => service.book(input))); expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1); expect(results.filter(result => result.status === "rejected" && result.reason instanceof SlotUnavailableError)).toHaveLength(19); });
});
describe("BusinessHoursPolicy", () => {
  const policy = new BusinessHoursPolicy(["2026-10-24"]);
  it.each(["2026-10-20T10:00:00+05:30", "2026-10-25T10:00:00+05:30", "2026-10-24T10:00:00+05:30", "2026-10-22T09:30:00+05:30", "2026-10-22T18:00:00+05:30", "2026-10-22T10:15:00+05:30", "2026-10-22T10:00:01+05:30", "2026-10-22T10:00:00.001+05:30", "2027-05-22T10:00:00+05:30"])("rejects %s", value => { expect(() => policy.validate(new Date(value), clock.now())).toThrow(ValidationError); });
  it("accepts the final slot of the business day", () => { expect(() => policy.validate(new Date("2026-10-22T17:30:00+05:30"), clock.now())).not.toThrow(); });
});
describe("AvailabilityService", () => {
  it("marks occupied slots and excludes Sundays and holidays", async () => { const repo = new FakeRepository(); await repo.create(input, new Date("2026-10-22T05:00:00Z")); const service = new AvailabilityService(repo, new SlotGenerator(new BusinessHoursPolicy(["2026-10-24"]), clock)); const slots = await service.day("2026-10-22"); expect(slots).toHaveLength(16); expect(slots[0].available).toBe(false); expect(slots[1].available).toBe(true); expect(await service.day("2026-10-25")).toEqual([]); const days = await service.month("2026-10"); expect(days).not.toContain("2026-10-24"); expect(days).not.toContain("2026-10-25"); });
});
it("rejects impossible dates and normalizes email", () => { expect(dateSchema.safeParse("2026-02-30").success).toBe(false); expect(bookingSchema.parse({ ...input, email: " TEST@EXAMPLE.COM " }).email).toBe("test@example.com"); });
