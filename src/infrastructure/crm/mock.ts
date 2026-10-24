import type { CrmGateway, Lead, Booking } from "@/domain/models";
import { logger } from "../logger";
export class MockCrmGateway implements CrmGateway {
  readonly records = new Map<string, { id: string }>();
  async upsertLead(lead: Lead, key: string) {
    const record = this.records.get(lead.dedupeKey) || {
      id: `mock_${lead.id}`,
    };
    this.records.set(lead.dedupeKey, record);
    logger.info(
      { leadId: lead.id, adapter: "mock", jobKey: key },
      "Mock CRM upsert",
    );
    return record;
  }
  async attachBooking(lead: Lead, booking: Booking, key: string) {
    logger.info(
      {
        leadId: lead.id,
        bookingUid: booking.calBookingUid,
        adapter: "mock",
        jobKey: key,
      },
      "Mock CRM booking",
    );
  }
}
