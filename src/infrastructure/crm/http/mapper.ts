import type { Lead, Booking } from "@/domain/models";
/** Replace only these mappings after the CRM owner supplies the real contract. */
export function mapLead(lead: Lead) {
  return {
    external_id: lead.id,
    dedupe_key: lead.dedupeKey,
    name: lead.fullName,
    email: lead.email,
    phone: lead.phoneE164,
    company: lead.companyName,
    industry: lead.industry,
    team_size: lead.teamSize,
    pain_point: lead.painPoint,
    plan_interest: lead.planInterest,
    interested_in: lead.interestedIn,
    lead_status: lead.status,
    consent_time: lead.consentAt.toISOString(),
    consent_source: lead.consentSource,
    ...lead.attribution,
  };
}
export function mapBooking(lead: Lead, booking: Booking) {
  return {
    dedupe_key: lead.dedupeKey,
    crm_lead_id: lead.crmLeadId,
    booking_id: booking.calBookingUid,
    booking_status: booking.status,
    booked_start_at: booking.startAt.toISOString(),
    timezone: booking.timezone,
    presenter: booking.presenter,
    meeting_url: booking.meetingUrl,
  };
}
