import { randomUUID } from "node:crypto";
import type { PrismaClient, CalendarReservation, Prisma } from "@prisma/client";
import { AppError } from "./CreateOrUpdateLead";
import {
  candidateSlots,
  indiaDate,
  isFree,
  BOOKING_TIMEZONE,
  type SchedulingRules,
} from "@/domain/scheduling";
import {
  GoogleApiError,
  type GoogleCalendar,
  type GoogleEvent,
} from "@/infrastructure/google/calendar";
import { hash, safeMeetingUrl } from "@/lib/security";

export class GoogleScheduling {
  constructor(
    private db: PrismaClient,
    private google: GoogleCalendar,
    private rules: SchedulingRules,
    private hosts: string[],
  ) {}
  private async connections(email?: string) {
    const connections = await this.db.googleCalendarConnection.findMany({
      where: {
        email: {
          in: email ? this.hosts.filter((host) => host === email) : this.hosts,
        },
      },
    });
    if (!connections.length)
      throw new AppError(
        503,
        "Our booking calendar is being connected. Your details are saved. Please try again shortly.",
      );
    return Promise.all(
      connections.map(async (c) => ({
        email: c.email,
        token: await this.google.accessToken(c.encryptedRefreshToken),
      })),
    );
  }
  private activeHolds(): Prisma.CalendarReservationWhereInput {
    return {
      status: { in: ["PENDING", "CONFIRMED"] },
    };
  }
  private async hostAvailability(date: string, email?: string) {
    const connections = await this.connections(email);
    const start = new Date(`${date}T00:00:00+05:30`);
    const end = new Date(start.getTime() + 86400000);
    const pad = this.rules.bufferMinutes * 60000;
    return Promise.all(
      connections.map(async (host) => ({
        ...host,
        busy: await this.google.busy(
          host.token,
          host.email,
          new Date(start.getTime() - pad).toISOString(),
          new Date(end.getTime() + pad).toISOString(),
        ),
      })),
    );
  }
  async availability(date: string) {
    const candidates = candidateSlots(date, this.rules);
    if (!candidates.length) return [];
    const hosts = await this.hostAvailability(date);
    const holds = await this.db.calendarReservation.findMany({
      where: {
        ...this.activeHolds(),
        startAt: { lt: new Date(`${date}T23:59:59+05:30`) },
        endAt: { gt: new Date(`${date}T00:00:00+05:30`) },
      },
    });
    return candidates.filter((slot) =>
      hosts.some((host) =>
        isFree(
          slot,
          [
            ...host.busy,
            ...holds.map((r) => ({
              start: r.startAt.toISOString(),
              end: r.endAt.toISOString(),
            })),
          ],
          this.rules,
        ),
      ),
    );
  }
  async reconcilePending() {
    // Recover abandoned/ambiguous requests without expiring a potentially real booking.
    const pending = await this.db.calendarReservation.findMany({
      where: {
        status: "PENDING",
        updatedAt: { lt: new Date(Date.now() - 120000) },
        OR: [
          { processingUntil: null },
          { processingUntil: { lt: new Date() } },
        ],
      },
      orderBy: { updatedAt: "asc" },
      take: 2,
    });
    const results = await Promise.allSettled(
      pending.map(async (reservation) => {
        const lead = await this.db.lead.findUnique({
          where: { id: reservation.leadId },
        });
        if (!lead) {
          await this.db.calendarReservation.update({
            where: { id: reservation.id },
            data: { status: "FAILED" },
          });
          return;
        }
        await this.complete(reservation, lead);
      }),
    );
    return {
      checked: pending.length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  }
  async book(leadId: string, attempt: string, start: string) {
    const lead = await this.db.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.kind !== "DEMO_BOOKING")
      throw new AppError(404, "Enquiry not found.");
    const requestKey = hash(`google:${leadId}:${attempt}`);
    let reservation = await this.db.calendarReservation.findUnique({
      where: { requestKey },
    });
    // Recover an earlier successful/ambiguous insert before checking availability again.
    if (reservation && reservation.status !== "FAILED")
      return this.complete(reservation, lead);
    if (!candidateSlots(indiaDate(new Date(start)), this.rules).includes(start))
      throw new AppError(422, "Please choose an available appointment time.");
    const end = new Date(
      Date.parse(start) + this.rules.durationMinutes * 60000,
    );
    const hosts = await this.hostAvailability(indiaDate(new Date(start)));
    reservation = await this.db.$transaction(async (tx) => {
      // Serialize allocation across all application instances, including overlapping starts.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('bizgenix-google-scheduling'))`;
      const existing = await tx.calendarReservation.findUnique({
        where: { requestKey },
      });
      if (existing && existing.status !== "FAILED") return existing;
      // One shared booking capacity across every presenter, checked under the
      // same database lock used to create the reservation.
      const conflict = await tx.calendarReservation.findFirst({
        where: {
          ...this.activeHolds(),
          startAt: {
            lt: new Date(end.getTime() + this.rules.bufferMinutes * 60000),
          },
          endAt: {
            gt: new Date(Date.parse(start) - this.rules.bufferMinutes * 60000),
          },
        },
      });
      if (conflict)
        throw new AppError(
          409,
          "That time was just taken. Please choose another available slot.",
        );
      const counts = await tx.calendarReservation.groupBy({
        by: ["presenter"],
        where: {
          presenter: { in: this.hosts },
          status: { in: ["PENDING", "CONFIRMED"] },
          createdAt: { gte: new Date(Date.now() - 30 * 86400000) },
        },
        _count: { _all: true },
      });
      const ordered = [...hosts].sort(
        (a, b) =>
          (counts.find((r) => r.presenter === a.email)?._count._all || 0) -
            (counts.find((r) => r.presenter === b.email)?._count._all || 0) ||
          a.email.localeCompare(b.email),
      );
      for (const host of ordered) {
        if (!isFree(start, host.busy, this.rules)) continue;
        if (existing)
          await tx.calendarReservation.delete({ where: { id: existing.id } });
        return tx.calendarReservation.create({
          data: {
            id: randomUUID(),
            requestKey,
            leadId,
            presenter: host.email,
            eventId: hash(randomUUID()),
            startAt: new Date(start),
            endAt: end,
          },
        });
      }
      throw new AppError(
        409,
        "That time was just taken. Please choose another available slot.",
      );
    });
    return this.complete(reservation, lead);
  }
  private async complete(
    reservation: CalendarReservation,
    lead: {
      id: string;
      fullName: string;
      email: string;
      companyName: string;
      marketingConsent: boolean;
    },
  ) {
    const processingUntil = new Date(Date.now() + 90000);
    const lease = await this.db.calendarReservation.updateMany({
      where: {
        id: reservation.id,
        OR: [
          { processingUntil: null },
          { processingUntil: { lt: new Date() } },
        ],
      },
      data: { processingUntil },
    });
    if (!lease.count)
      throw new AppError(
        423,
        "Your booking is still being checked. Please wait a moment and retry the same time.",
      );
    try {
      return await this.completeLocked(reservation, lead);
    } finally {
      await this.db.calendarReservation.updateMany({
        where: { id: reservation.id, processingUntil },
        data: { processingUntil: null },
      });
    }
  }
  private async completeLocked(
    reservation: CalendarReservation,
    lead: {
      id: string;
      fullName: string;
      email: string;
      companyName: string;
      marketingConsent: boolean;
    },
  ) {
    const connections = await this.connections(reservation.presenter);
    const host = connections.find((c) => c.email === reservation.presenter);
    if (!host)
      throw new AppError(
        503,
        "The assigned calendar needs attention. Please try again later.",
      );
    let event = await this.google.event(
      host.token,
      host.email,
      reservation.eventId,
    );
    if (!event) {
      if (reservation.status === "CONFIRMED")
        throw new AppError(
          409,
          "This appointment has changed. Please contact the organizer.",
        );
      const busy = await this.google.busy(
        host.token,
        host.email,
        new Date(
          reservation.startAt.getTime() - this.rules.bufferMinutes * 60000,
        ).toISOString(),
        new Date(
          reservation.endAt.getTime() + this.rules.bufferMinutes * 60000,
        ).toISOString(),
      );
      if (
        reservation.startAt.getTime() < Date.now() ||
        !isFree(reservation.startAt.toISOString(), busy, this.rules)
      ) {
        await this.db.calendarReservation.update({
          where: { id: reservation.id },
          data: { status: "FAILED" },
        });
        throw new AppError(
          409,
          "That time is no longer available. Please choose another slot.",
        );
      }
      try {
        event = await this.google.create(host.token, host.email, {
          eventId: reservation.eventId,
          leadId: lead.id,
          fullName: lead.fullName,
          email: lead.email,
          company: lead.companyName,
          start: reservation.startAt.toISOString(),
          end: reservation.endAt.toISOString(),
        });
      } catch (error) {
        if (error instanceof GoogleApiError && error.status === 409)
          event = await this.google.event(
            host.token,
            host.email,
            reservation.eventId,
          );
        else {
          // Definite rejection can release the hold; ambiguous network/5xx results retain it.
          if (
            error instanceof GoogleApiError &&
            [400, 401, 403].includes(error.status)
          )
            await this.db.calendarReservation.update({
              where: { id: reservation.id },
              data: { status: "FAILED" },
            });
          throw error;
        }
      }
    }
    if (event?.status === "cancelled") {
      await this.db.calendarReservation.update({
        where: { id: reservation.id },
        data: { status: "FAILED" },
      });
      await this.db.booking.updateMany({
        where: { calBookingUid: `google:${event.id}` },
        data: { status: "CANCELLED", eventAt: new Date() },
      });
      throw new AppError(
        409,
        "This appointment was cancelled. Please choose a new time.",
      );
    }
    if (
      !event ||
      event.status !== "confirmed" ||
      !event.start?.dateTime ||
      !event.end?.dateTime ||
      event.extendedProperties?.private?.leadId !== lead.id
    )
      throw new AppError(
        503,
        "This booking needs to be checked. Please retry your original time or contact the organizer.",
      );
    return this.persist(reservation, event, lead.marketingConsent);
  }
  private async persist(
    reservation: CalendarReservation,
    event: GoogleEvent,
    marketingConsent: boolean,
  ) {
    const uid = `google:${event.id}`;
    const booking = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reservation.requestKey}))`;
      const existing = await tx.booking.findUnique({
        where: { calBookingUid: uid },
      });
      if (existing) return existing;
      const now = new Date();
      const booking = await tx.booking.create({
        data: {
          provider: "google",
          calBookingUid: uid,
          leadId: reservation.leadId,
          status: "CONFIRMED",
          startAt: new Date(event.start!.dateTime!),
          endAt: new Date(event.end!.dateTime!),
          timezone: BOOKING_TIMEZONE,
          presenter: reservation.presenter,
          meetingUrl: safeMeetingUrl(event.hangoutLink),
          eventAt: now,
          rawPayload: { id: event.id, htmlLink: event.htmlLink || "" },
        },
      });
      await tx.calendarReservation.update({
        where: { id: reservation.id },
        data: {
          status: "CONFIRMED",
          startAt: booking.startAt,
          endAt: booking.endAt,
        },
      });
      await tx.lead.update({
        where: { id: reservation.leadId },
        data: { status: "BOOKED", assignedOwner: reservation.presenter },
      });
      for (const type of [
        "CRM_UPDATE_BOOKING",
        "NOTIFY_TEAM",
        ...(marketingConsent ? ["META_CAPI"] : []),
      ])
        await tx.outboxJob.upsert({
          where: { idempotencyKey: `${type}:${uid}` },
          create: {
            type,
            payload: {
              leadId: reservation.leadId,
              bookingUid: uid,
              ...(type === "META_CAPI" ? { conversion: true } : {}),
            },
            idempotencyKey: `${type}:${uid}`,
          },
          update: {},
        });
      return booking;
    });
    return {
      status: booking.status,
      uid: booking.calBookingUid,
      startAt: booking.startAt.toISOString(),
      timezone: booking.timezone,
      meetingUrl: booking.meetingUrl || undefined,
    };
  }
}
