import { PrismaClient } from "@prisma/client";
import { describe, it, expect, afterAll } from "vitest";
import {
  PrismaLeadRepository,
  PrismaBookingRepository,
  PrismaOutboxRepository,
} from "@/infrastructure/prisma/repositories";
import { leadSchema, webhookSchema } from "@/shared/schemas";
import { dedupeKey } from "@/lib/security";
import { formContent } from "@/content/landing";
const enabled = Boolean(process.env.TEST_DATABASE_URL);
const db = new PrismaClient({
  datasourceUrl:
    process.env.TEST_DATABASE_URL ||
    "postgresql://unconfigured:unconfigured@localhost:5433/unconfigured",
});
afterAll(() => db.$disconnect());
describe.skipIf(!enabled)("PostgreSQL transaction contracts", () => {
  it("deduplicates leads, webhooks and outbox jobs under concurrency", async () => {
    const email = `qa-${Date.now()}@example.test`;
    const input = leadSchema.parse({
      kind: "DEMO_BOOKING",
      full_name: "Test Person",
      company_name: "Test Company",
      work_email: email,
      mobile: "9876543210",
      team_size: formContent.teamSizes[0],
      industry: formContent.industries[0],
      interested_in: "AI CRM",
      consent: true,
      analytics_consent: true,
    });
    const leads = new PrismaLeadRepository(db),
      bookings = new PrismaBookingRepository(db),
      jobs = new PrismaOutboxRepository(db);
    const key = dedupeKey(email, input.mobile);
    try {
      const results = await Promise.all([
        leads.save(input, key),
        leads.save(input, key),
      ]);
      expect(results[0].id).toBe(results[1].id);
      expect(
        await db.outboxJob.count({
          where: { payload: { path: ["leadId"], equals: results[0].id } },
        }),
      ).toBe(2);
      const event = webhookSchema.parse({
        triggerEvent: "BOOKING_CREATED",
        createdAt: new Date().toISOString(),
        payload: {
          uid: `qa-${Date.now()}`,
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 87600000).toISOString(),
          attendees: [{ email, timeZone: "Asia/Kolkata" }],
          metadata: { leadId: results[0].id },
        },
      });
      await Promise.all([bookings.apply(event), bookings.apply(event)]);
      expect((await bookings.latest(results[0].id))?.status).toBe("CONFIRMED");
      expect(
        await db.booking.count({ where: { calBookingUid: event.payload.uid } }),
      ).toBe(1);
      const older = {
        ...event,
        triggerEvent: "BOOKING_CANCELLED" as const,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      };
      await bookings.apply(older);
      expect((await bookings.latest(results[0].id))?.status).toBe("CONFIRMED");
      const [a, b] = await Promise.all([jobs.claim(2), jobs.claim(2)]);
      expect(a.some((x) => b.some((y) => y.id === x.id))).toBe(false);
    } finally {
      const rows = await db.lead.findMany({ where: { email } });
      for (const row of rows) {
        await db.outboxJob.deleteMany({
          where: { payload: { path: ["leadId"], equals: row.id } },
        });
        const existing = await db.booking.findMany({
          where: { leadId: row.id },
        });
        for (const book of existing)
          await db.webhookEvent.deleteMany({
            where: { externalId: { startsWith: book.calBookingUid } },
          });
        await db.booking.deleteMany({ where: { leadId: row.id } });
        await db.lead.delete({ where: { id: row.id } });
      }
    }
  });
});
