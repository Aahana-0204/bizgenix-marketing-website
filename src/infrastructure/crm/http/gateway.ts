import { z } from "zod";
import type { CrmGateway, Lead, Booking } from "@/domain/models";
import { mapLead, mapBooking } from "./mapper";
/** Generic REST contract; the backend owner must verify endpoints and mapping. */
export class HttpCrmGateway implements CrmGateway {
  constructor(
    private base: string,
    private key: string,
  ) {}
  private async request(path: string, body: unknown, idempotencyKey: string) {
    const response = await fetch(`${this.base.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`CRM_HTTP_${response.status}`);
    return response;
  }
  async upsertLead(lead: Lead, key: string) {
    const response = await this.request("/leads/upsert", mapLead(lead), key);
    return z
      .object({
        id: z.union([z.string().min(1), z.number()]).transform(String),
      })
      .parse(await response.json());
  }
  async attachBooking(lead: Lead, booking: Booking, key: string) {
    await this.request("/bookings/upsert", mapBooking(lead, booking), key);
  }
}
