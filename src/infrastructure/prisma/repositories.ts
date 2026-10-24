import { bookingStatus } from "@/domain/booking";
import type { Prisma, PrismaClient, Lead as DbLead } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type {
  Lead,
  LeadRepository,
  BookingRepository,
  OutboxRepository,
  Job,
  Booking,
} from "@/domain/models";
import type { ValidLead, CalEvent } from "@/shared/schemas";
import { hash, safeMeetingUrl } from "@/lib/security";
const attributionMap = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  gclid: "gclid",
  fbclid: "fbclid",
  _fbp: "fbp",
  _fbc: "fbc",
  landing_page_url: "landingPageUrl",
  referrer: "referrer",
} as const;
export function toLead(row: DbLead): Lead {
  const attribution: Record<string, string> = {};
  for (const [key, column] of Object.entries(attributionMap)) {
    const value = row[column as keyof DbLead];
    if (typeof value === "string") attribution[key] = value;
  }
  return { ...row, attribution };
}
async function enqueue(
  tx: Prisma.TransactionClient,
  type: string,
  payload: Job["payload"],
  key: string,
) {
  await tx.outboxJob.upsert({
    where: { idempotencyKey: key },
    create: { type, payload, idempotencyKey: key },
    update: {},
  });
}
export class PrismaLeadRepository implements LeadRepository {
  constructor(private db: PrismaClient) {}
  async save(input: ValidLead, key: string) {
    return this.db.$transaction(async (tx) => {
      const source: Record<string, string> = {};
      for (const [external, column] of Object.entries(attributionMap))
        if (input.attribution?.[external])
          source[column] = input.attribution[external];
      const data = {
        kind: input.kind,
        fullName: input.full_name,
        companyName: input.company_name,
        email: input.work_email,
        phoneE164: input.mobile,
        industry: input.industry,
        teamSize: input.team_size,
        interestedIn: input.interested_in,
        painPoint: input.key_challenge,
        planInterest: input.plan_interest,
        consentAt: new Date(),
        consentSource: "landing_form_v1",
        marketingConsent: input.analytics_consent,
        ...source,
      };
      const row = await tx.lead.upsert({
        where: { dedupeKey: key },
        create: { ...data, dedupeKey: key },
        update: data,
      });
      // Each accepted update is a distinct delivery revision; identity remains deduplicated.
      const revision = hash(JSON.stringify(input));
      await enqueue(
        tx,
        "CRM_UPSERT_LEAD",
        { leadId: row.id },
        `lead:${row.id}:${revision}`,
      );
      await enqueue(
        tx,
        "NOTIFY_TEAM",
        { leadId: row.id },
        `notify:${row.id}:${revision}`,
      );
      return toLead(row);
    });
  }
  async find(id: string) {
    const row = await this.db.lead.findUnique({ where: { id } });
    return row ? toLead(row) : null;
  }
}
export class PrismaBookingRepository implements BookingRepository {
  constructor(private db: PrismaClient) {}
  async apply(event: CalEvent) {
    const p = event.payload,
      eventAt = new Date(event.createdAt);
    try {
      await this.db.$transaction(
        async (tx) => {
          await tx.webhookEvent.create({
            data: {
              provider: "calcom",
              externalId: `${p.uid}:${event.createdAt}`,
              type: event.triggerEvent,
            },
          });
          // Serialize lifecycle events for one UID, including concurrent first deliveries.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${p.uid}))`;
          const existing = await tx.booking.findUnique({
            where: { calBookingUid: p.uid },
          });
          if (existing && existing.eventAt >= eventAt) return;
          const attendee = p.attendees[0].email.toLowerCase();
          const metaId =
            typeof p.metadata?.leadId === "string"
              ? p.metadata.leadId
              : undefined;
          const candidate = metaId
            ? await tx.lead.findUnique({ where: { id: metaId } })
            : null;
          const lead =
            candidate?.email === attendee
              ? candidate
              : await tx.lead.findFirst({
                  where: { email: attendee },
                  orderBy: { updatedAt: "desc" },
                });
          const status = bookingStatus(event);
          const data = {
            leadId: lead?.id || existing?.leadId,
            status,
            startAt: new Date(p.startTime),
            endAt: new Date(p.endTime),
            timezone: p.attendees[0].timeZone || "Asia/Kolkata",
            presenter: p.organizer?.email,
            meetingUrl:
              safeMeetingUrl(p.videoCallData?.url) ||
              safeMeetingUrl(p.location),
            eventAt,
            rawPayload: JSON.parse(
              JSON.stringify(event),
            ) as Prisma.InputJsonValue,
          };
          await tx.booking.upsert({
            where: { calBookingUid: p.uid },
            create: { ...data, status, calBookingUid: p.uid },
            update: { ...data, status },
          });
          const previousUid = p.rescheduledFromUid || p.rescheduleUid;
          if (
            event.triggerEvent === "BOOKING_RESCHEDULED" &&
            previousUid &&
            previousUid !== p.uid
          )
            await tx.booking.updateMany({
              where: { calBookingUid: previousUid, eventAt: { lt: eventAt } },
              data: { status: "CANCELLED", eventAt },
            });
          if (!lead) return;
          const confirmed = status === "CONFIRMED" || status === "RESCHEDULED";
          if (confirmed)
            await tx.lead.update({
              where: { id: lead.id },
              data: { status: "BOOKED" },
            });
          const key = `${p.uid}:${event.triggerEvent}:${event.createdAt}`;
          await enqueue(
            tx,
            "CRM_UPDATE_BOOKING",
            { leadId: lead.id, bookingUid: p.uid },
            `crm:${key}`,
          );
          await enqueue(
            tx,
            "NOTIFY_TEAM",
            { leadId: lead.id, bookingUid: p.uid },
            `notify:${key}`,
          );
          // One initial conversion per UID, not per reschedule or webhook retry.
          if (confirmed && lead.marketingConsent)
            await enqueue(
              tx,
              "META_CAPI",
              { leadId: lead.id, bookingUid: p.uid, conversion: true },
              `conversion:${p.uid}`,
            );
        },
        { timeout: 15000 },
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  async latest(leadId: string, since?: Date): Promise<Booking | null> {
    return this.db.booking.findFirst({
      where: { leadId, ...(since ? { eventAt: { gte: since } } : {}) },
      orderBy: { eventAt: "desc" },
    });
  }
}
export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private db: PrismaClient) {}
  async claim(limit: number) {
    const lease = randomUUID();
    const rows = await this.db.$queryRaw<
      Array<{
        id: string;
        type: string;
        payload: Job["payload"];
        idempotencyKey: string;
        attempts: number;
      }>
    >`WITH due AS (SELECT id FROM "OutboxJob" WHERE (status='PENDING' AND "nextRunAt" <= NOW()) OR (status='PROCESSING' AND "lockedAt" < NOW() - INTERVAL '5 minutes') ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT ${limit}) UPDATE "OutboxJob" j SET status='PROCESSING', "lockedAt"=NOW(), "leaseToken"=${lease}, attempts=attempts+1, "updatedAt"=NOW() FROM due WHERE j.id=due.id RETURNING j.*`;
    return rows.map((row) => ({ ...row, leaseToken: lease }));
  }
  async complete(job: Job) {
    await this.db.outboxJob.updateMany({
      where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" },
      data: {
        status: "DONE",
        lockedAt: null,
        leaseToken: null,
        lastError: null,
      },
    });
  }
  async retry(job: Job, delay: number | null) {
    await this.db.outboxJob.updateMany({
      where: { id: job.id, leaseToken: job.leaseToken, status: "PROCESSING" },
      data: {
        status: delay === null ? "FAILED" : "PENDING",
        lockedAt: null,
        leaseToken: null,
        nextRunAt: new Date(Date.now() + (delay || 0)),
        lastError:
          "External delivery failed; inspect provider diagnostics using the job id.",
      },
    });
  }
}
