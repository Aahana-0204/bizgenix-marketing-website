import type { LeadRepository, RateLimiter } from "@/domain/models";
import { leadSchema } from "@/shared/schemas";
import { dedupeKey } from "@/lib/security";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class CreateOrUpdateLead {
  constructor(
    private leads: LeadRepository,
    private limiter: RateLimiter,
  ) {}
  async execute(raw: unknown, ip: string) {
    const data = leadSchema.parse(raw);
    if (data.website) throw new AppError(400, "Unable to accept this enquiry.");
    if (!(await this.limiter.allow(ip, data.work_email)))
      throw new AppError(
        429,
        "Too many requests. Please try again in a few minutes.",
      );
    return this.leads.save(data, dedupeKey(data.work_email, data.mobile));
  }
}
