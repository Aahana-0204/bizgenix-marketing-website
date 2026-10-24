import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { GoogleScheduling } from "@/application/GoogleScheduling";
import type {
  GoogleCalendar,
  GoogleEvent,
} from "@/infrastructure/google/calendar";
import {
  candidateSlots,
  indiaDate,
  type SchedulingRules,
} from "@/domain/scheduling";
const db = new PrismaClient({
  datasourceUrl:
    process.env.TEST_DATABASE_URL ||
    "postgresql://unused:unused@localhost:5433/unused",
});
afterAll(() => db.$disconnect());
describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "Google booking allocation on PostgreSQL",
  () => {
    it("allows only one booking per time across both hosts, rejects concurrent duplicates, and recovers a lost Google response", async () => {
      const tag = randomUUID();
      const hosts = [`a-${tag}@example.test`, `b-${tag}@example.test`];
      const rules: SchedulingRules = {
        durationMinutes: 30,
        bufferMinutes: 10,
        noticeMinutes: 0,
        horizonDays: 30,
        startHour: 10,
        endHour: 18,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
      };
      const date = indiaDate(new Date(Date.now() + 86400000));
      const start = candidateSlots(date, rules)[0];
      const events = new Map<string, GoogleEvent>();
      let loseResponse = true;
      let inserts = 0;
      const fake = {
        accessToken: async () => "test-access",
        busy: async (_token: string, email: string) =>
          [...events.entries()]
            .filter(([key]) => key.startsWith(`${email}:`))
            .map(([, e]) => ({
              start: e.start!.dateTime!,
              end: e.end!.dateTime!,
            })),
        event: async (_token: string, email: string, id: string) =>
          events.get(`${email}:${id}`) || null,
        create: async (
          _token: string,
          email: string,
          data: { eventId: string; leadId: string; start: string; end: string },
        ) => {
          inserts++;
          const event: GoogleEvent = {
            id: data.eventId,
            status: "confirmed",
            start: { dateTime: data.start },
            end: { dateTime: data.end },
            extendedProperties: { private: { leadId: data.leadId } },
          };
          events.set(`${email}:${data.eventId}`, event);
          if (loseResponse) {
            loseResponse = false;
            throw new Error("response lost after insert");
          }
          return event;
        },
      } as unknown as GoogleCalendar;
      const scheduler = new GoogleScheduling(db, fake, rules, hosts);
      const leadIds: string[] = [];
      try {
        await db.googleCalendarConnection.createMany({
          data: hosts.map((email) => ({
            email,
            encryptedRefreshToken: "test-token",
          })),
        });
        for (let i = 0; i < 3; i++) {
          const lead = await db.lead.create({
            data: {
              dedupeKey: `${tag}:${i}`,
              kind: "DEMO_BOOKING",
              fullName: "Test Guest",
              companyName: "Test",
              email: `guest-${tag}-${i}@example.test`,
              phoneE164: "+919876543210",
              consentAt: new Date(),
              consentSource: "test",
            },
          });
          leadIds.push(lead.id);
        }
        await expect(
          scheduler.book(leadIds[0], "attempt", start),
        ).rejects.toThrow("response lost");
        const recovered = await scheduler.book(leadIds[0], "attempt", start);
        expect(recovered.status).toBe("CONFIRMED");
        expect(inserts).toBe(1);
        // Confirmed reservations must remain globally blocked beyond propagation grace.
        await db.calendarReservation.updateMany({
          where: { leadId: leadIds[0] },
          data: { updatedAt: new Date(Date.now() - 3600000) },
        });
        await expect(
          scheduler.book(leadIds[1], "attempt", start),
        ).rejects.toThrow("just taken");
        expect(inserts).toBe(1);
        expect(await scheduler.availability(date)).not.toContain(start);
        const secondStart = new Date(
          Date.parse(start) + 120 * 60000,
        ).toISOString();
        const results = await Promise.allSettled([
          scheduler.book(leadIds[1], "attempt", secondStart),
          scheduler.book(leadIds[2], "attempt", secondStart),
        ]);
        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
        expect(inserts).toBe(2);
        const assigned = await db.calendarReservation.findMany({
          where: { leadId: { in: leadIds } },
        });
        expect(new Set(assigned.map((r) => r.presenter)).size).toBe(2);
        expect(await scheduler.availability(date)).not.toContain(start);
        expect(await scheduler.availability(date)).not.toContain(secondStart);
        expect((await scheduler.book(leadIds[0], "attempt", start)).uid).toBe(
          recovered.uid,
        );
        expect(inserts).toBe(2);
        expect(
          await db.booking.count({ where: { leadId: { in: leadIds } } }),
        ).toBe(2);
      } finally {
        for (const leadId of leadIds)
          await db.outboxJob.deleteMany({
            where: { payload: { path: ["leadId"], equals: leadId } },
          });
        await db.calendarReservation.deleteMany({
          where: { leadId: { in: leadIds } },
        });
        await db.booking.deleteMany({ where: { leadId: { in: leadIds } } });
        await db.lead.deleteMany({ where: { id: { in: leadIds } } });
        await db.googleCalendarConnection.deleteMany({
          where: { email: { in: hosts } },
        });
      }
    });
  },
);
