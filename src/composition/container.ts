import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/config/server";
import { database } from "@/infrastructure/prisma/client";
import {
  PrismaLeadRepository,
  PrismaBookingRepository,
  PrismaOutboxRepository,
} from "@/infrastructure/prisma/repositories";
import { MemoryStore } from "@/infrastructure/memory";
import { LocalLimiter, UpstashLimiter } from "@/infrastructure/limiter";
import { MockCrmGateway } from "@/infrastructure/crm/mock";
import { HttpCrmGateway } from "@/infrastructure/crm/http/gateway";
import { ExternalDelivery } from "@/infrastructure/delivery";
import { CreateOrUpdateLead } from "@/application/CreateOrUpdateLead";
import { ProcessOutbox } from "@/application/ProcessOutbox";
import { reportFailure } from "@/infrastructure/logger";
function makeContainer() {
  const db = env.DATABASE_URL ? database() : null;
  const memory = new MemoryStore();
  const leads = db ? new PrismaLeadRepository(db) : memory;
  const bookings = db ? new PrismaBookingRepository(db) : memory;
  const jobs = db ? new PrismaOutboxRepository(db) : memory;
  const limiter =
    env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashLimiter(
          env.UPSTASH_REDIS_REST_URL,
          env.UPSTASH_REDIS_REST_TOKEN,
        )
      : new LocalLimiter();
  const crm =
    env.CRM_ADAPTER === "http"
      ? new HttpCrmGateway(env.CRM_BASE_URL!, env.CRM_API_KEY!)
      : new MockCrmGateway();
  const delivery = db
    ? new ExternalDelivery(db, crm)
    : { send: async () => {} };
  return {
    db,
    leads,
    bookings,
    jobs,
    availabilityLimiter: limiter,
    createLead: new CreateOrUpdateLead(leads, limiter),
    outbox: new ProcessOutbox(jobs, delivery, (id) =>
      reportFailure("OUTBOX_EXHAUSTED", id),
    ),
    secret: env.CRON_SECRET || randomBytes(32).toString("hex"),
  };
}
const globalContainer = globalThis as unknown as {
  crmContainer?: ReturnType<typeof makeContainer>;
};
export function container() {
  return (globalContainer.crmContainer ??= makeContainer());
}
