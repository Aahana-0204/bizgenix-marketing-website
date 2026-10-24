import { randomUUID } from "node:crypto";
import type {
  LeadRepository,
  BookingRepository,
  OutboxRepository,
  Lead,
} from "@/domain/models";
import type { ValidLead } from "@/shared/schemas";
/** Explicit non-production fake. No durable storage or booking confirmations. */
export class MemoryStore
  implements LeadRepository, BookingRepository, OutboxRepository
{
  leads = new Map<string, Lead>();
  async save(input: ValidLead, key: string) {
    const old = [...this.leads.values()].find((l) => l.dedupeKey === key);
    const now = new Date();
    const row: Lead = {
      id: old?.id || randomUUID(),
      dedupeKey: key,
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
      status: old?.status || "NEW",
      consentAt: now,
      consentSource: "landing_form_preview",
      marketingConsent: input.analytics_consent,
      attribution: input.attribution || {},
      createdAt: old?.createdAt || now,
      updatedAt: now,
    };
    this.leads.set(row.id, row);
    return row;
  }
  async find(id: string) {
    return this.leads.get(id) || null;
  }
  async latest() {
    return null;
  }
  async apply() {
    throw new Error("Webhook persistence requires a database");
  }
  async claim() {
    return [];
  }
  async complete() {}
  async retry() {}
}
