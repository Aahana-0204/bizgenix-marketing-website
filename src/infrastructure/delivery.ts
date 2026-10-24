import type { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import type { Delivery, Job, CrmGateway } from "@/domain/models";
import { env } from "@/config/server";
import { recipients } from "@/config/routing";
import { toLead } from "./prisma/repositories";
import { hash } from "@/lib/security";
export class ExternalDelivery implements Delivery {
  constructor(
    private db: PrismaClient,
    private crm: CrmGateway,
  ) {}
  async send(job: Job) {
    const row = await this.db.lead.findUniqueOrThrow({
      where: { id: job.payload.leadId },
    });
    const lead = toLead(row);
    const booking = job.payload.bookingUid
      ? await this.db.booking.findUniqueOrThrow({
          where: { calBookingUid: job.payload.bookingUid },
        })
      : null;
    if (job.type === "CRM_UPSERT_LEAD") {
      const result = await this.crm.upsertLead(lead, job.idempotencyKey);
      await this.db.lead.update({
        where: { id: lead.id },
        data: { crmLeadId: result.id, crmSyncedAt: new Date() },
      });
      return;
    }
    if (job.type === "CRM_UPDATE_BOOKING" && booking) {
      if (!lead.crmLeadId) {
        const result = await this.crm.upsertLead(
          lead,
          `ensure:${lead.dedupeKey}`,
        );
        lead.crmLeadId = result.id;
        await this.db.lead.update({
          where: { id: lead.id },
          data: { crmLeadId: result.id, crmSyncedAt: new Date() },
        });
      }
      await this.crm.attachBooking(lead, booking, job.idempotencyKey);
      return;
    }
    if (job.type === "NOTIFY_TEAM") {
      const to = recipients(booking ? "booking" : "lead", booking?.presenter);
      if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !to.length)
        throw new Error("NOTIFICATION_NOT_CONFIGURED");
      const resend = new Resend(env.RESEND_API_KEY);
      // Separate messages prevent exposing recipient lists and minimize presenter data.
      for (const email of to) {
        const qualifier = email === env.ROUTE_QUALIFIER_EMAIL;
        const text = qualifier
          ? `Lead ${lead.id}\n${lead.fullName} | ${lead.companyName}\nEmail: ${lead.email}\nPhone: ${lead.phoneE164}\nInterest: ${lead.interestedIn || lead.planInterest || lead.kind}\nIndustry: ${lead.industry || "Not supplied"}\nTeam: ${lead.teamSize}\nChallenge: ${lead.painPoint || "Not supplied"}${booking ? `\nBooking: ${booking.status}\n${booking.startAt.toISOString()} (${booking.timezone})` : ""}`
          : `Demo ${booking?.status}: ${lead.companyName}\nContact: ${lead.fullName} (${lead.email})\nTime: ${booking?.startAt.toISOString()} (${booking?.timezone})\nMeeting: ${booking?.meetingUrl || "See Cal.com"}\nLead reference: ${lead.id}`;
        const result = await resend.emails.send(
          {
            from: env.EMAIL_FROM,
            to: email,
            subject: booking
              ? `CRM demo: ${booking.status}`
              : "New CRM enquiry",
            text,
          },
          {
            idempotencyKey: `${job.idempotencyKey}:${hash(email).slice(0, 12)}`,
          },
        );
        if (result.error) throw new Error("EMAIL_DELIVERY_FAILED");
      }
      return;
    }
    if (job.type === "META_CAPI" && booking) {
      if (!lead.marketingConsent) return;
      const token = env.META_CAPI_TOKEN || env.META_CAPI_ACCESS_TOKEN;
      if (!token || !env.META_PIXEL_ID) throw new Error("META_NOT_CONFIGURED");
      const response = await fetch(
        `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PIXEL_ID}/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data: [
              {
                event_name: "demo_booking_confirmed",
                event_time: Math.floor(booking.eventAt.getTime() / 1000),
                event_id: booking.calBookingUid,
                action_source: "website",
                event_source_url:
                  lead.attribution.landing_page_url || env.NEXT_PUBLIC_SITE_URL,
                user_data: {
                  em: [hash(lead.email)],
                  ph: [hash(lead.phoneE164.replace(/\D/g, ""))],
                  external_id: [hash(lead.id)],
                  fbp: lead.attribution._fbp,
                  fbc: lead.attribution._fbc,
                },
              },
            ],
            ...(env.META_TEST_EVENT_CODE
              ? { test_event_code: env.META_TEST_EVENT_CODE }
              : {}),
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error(`META_HTTP_${response.status}`);
      return;
    }
    throw new Error("UNKNOWN_OUTBOX_JOB");
  }
}
