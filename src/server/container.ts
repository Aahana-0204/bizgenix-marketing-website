import { getEnv } from "./config/env";
import { getPrisma } from "./infra/prisma";
import { ResendEmailService } from "./infra/ResendEmailService";
import { BusinessHoursPolicy } from "./policies/BusinessHoursPolicy";
import { PrismaBookingRepository } from "./repositories/PrismaBookingRepository";
import { AvailabilityService } from "./services/AvailabilityService";
import { BookingService } from "./services/BookingService";
import { SlotGenerator } from "./services/SlotGenerator";

export function getContainer() {
  const env = getEnv();
  const prisma = getPrisma();
  const repository = new PrismaBookingRepository(prisma);
  const policy = new BusinessHoursPolicy(env.BOOKING_HOLIDAYS);
  const clock = { now: () => new Date() };
  return { prisma, booking: new BookingService(repository, new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM), clock, policy, env.BOOKING_DAILY_LIMIT), availability: new AvailabilityService(repository, new SlotGenerator(policy, clock)) };
}
