import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { POST } from "@/app/api/bookings/route";
const database = process.env.TEST_DATABASE_URL;
describe.skipIf(!database)("PostgreSQL booking route concurrency (dedicated test database)", () => {
  let prisma: PrismaClient;
  const runId = `integration-${Date.now()}`;
  const start = new Date(); start.setUTCDate(start.getUTCDate() + 3); start.setUTCHours(4, 30, 0, 0); if (start.getUTCDay() === 0) start.setUTCDate(start.getUTCDate() + 1);
  beforeAll(async () => { vi.stubEnv("DATABASE_URL", database!); vi.stubEnv("DIRECT_URL", database!); vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("BOOKING_HOLIDAYS", ""); prisma = new PrismaClient({ datasources: { db: { url: database } } }); await prisma.$connect(); });
  afterAll(async () => { if (prisma) { await prisma.booking.deleteMany({ where: { companyName: runId } }); await prisma.dailyQuota.deleteMany({ where: { key: { contains: runId } } }); await prisma.$disconnect(); } vi.unstubAllEnvs(); });
  it("returns exactly one 201 and nineteen 409 responses for one slot", async () => {
    const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => POST(new Request("http://localhost/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: runId, fullName: "Integration Test", email: `${runId}-${i}@example.com`, mobile: "+919876543210", interest: "CRM", website: "", slotStart: start.toISOString() }) }))));
    expect(responses.filter(response => response.status === 201)).toHaveLength(1);
    expect(responses.filter(response => response.status === 409)).toHaveLength(19);
    for (const response of responses.filter(response => response.status === 409)) expect((await response.json()).error.code).toBe("SLOT_TAKEN");
    expect(await prisma.booking.count({ where: { companyName: runId } })).toBe(1);
  }, 60000);
});
