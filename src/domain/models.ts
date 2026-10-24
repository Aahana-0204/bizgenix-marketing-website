import type { ValidLead, CalEvent } from "@/shared/schemas";
export type Lead = {
  id: string;
  dedupeKey: string;
  fullName: string;
  companyName: string;
  email: string;
  phoneE164: string;
  kind: string;
  industry?: string | null;
  teamSize?: string | null;
  interestedIn?: string | null;
  painPoint?: string | null;
  planInterest?: string | null;
  status: string;
  consentAt: Date;
  consentSource: string;
  marketingConsent: boolean;
  attribution: Record<string, string>;
  crmLeadId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
export type Booking = {
  id: string;
  calBookingUid: string;
  leadId: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  presenter?: string | null;
  meetingUrl?: string | null;
  eventAt: Date;
};
export type Job = {
  id: string;
  type: string;
  payload: { leadId: string; bookingUid?: string; conversion?: boolean };
  idempotencyKey: string;
  attempts: number;
  leaseToken: string;
};
/** Transaction boundary: lead writes and delivery jobs must commit together. */
export interface LeadRepository {
  save(input: ValidLead, key: string): Promise<Lead>;
  find(id: string): Promise<Lead | null>;
}
/** Signed provider events must be deduplicated atomically with booking writes. */
export interface BookingRepository {
  apply(event: CalEvent): Promise<void>;
  latest(leadId: string, since?: Date): Promise<Booking | null>;
}
/** Jobs have exclusive expiring leases so concurrent workers can recover safely. */
export interface OutboxRepository {
  claim(limit: number): Promise<Job[]>;
  complete(job: Job): Promise<void>;
  retry(job: Job, delay: number | null): Promise<void>;
}
/** Providers must honor the supplied idempotency key on every write. */
export interface CrmGateway {
  upsertLead(lead: Lead, key: string): Promise<{ id: string }>;
  attachBooking(lead: Lead, booking: Booking, key: string): Promise<void>;
}
export interface RateLimiter {
  allow(ip: string, email: string): Promise<boolean>;
}
export interface Delivery {
  send(job: Job): Promise<void>;
}
export interface Clock {
  now(): Date;
}
