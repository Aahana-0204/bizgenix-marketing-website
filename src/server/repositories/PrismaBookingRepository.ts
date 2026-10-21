import { Prisma, type PrismaClient } from "@prisma/client";
import type { BookingInput } from "@/shared/schemas";
import type { IBookingRepository } from "../interfaces";
import { RateLimitError, SlotUnavailableError } from "../domain/errors";
import { istDay } from "../policies/BusinessHoursPolicy";

export async function consumeQuota(tx: Prisma.TransactionClient, key: string, limit: number) {
  const quota = await tx.dailyQuota.upsert({ where: { key }, create: { key, count: 1 }, update: { count: { increment: 1 } } });
  if (quota.count > limit) throw new RateLimitError();
}
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(input: BookingInput, end: Date, limit: number, now: Date) {
    try {
      return await this.prisma.$transaction(async tx => {
        await consumeQuota(tx, `booking:${input.email}:${istDay(now)}`, limit);
        return tx.booking.create({ data: { companyName: input.companyName, fullName: input.fullName, email: input.email, mobile: input.mobile, interest: input.interest, message: input.message, slotStart: new Date(input.slotStart), slotEnd: end } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new SlotUnavailableError();
      throw error;
    }
  }
  async taken(from: Date, to: Date) {
    return (await this.prisma.booking.findMany({ where: { slotStart: { gte: from, lt: to } }, select: { slotStart: true } })).map(row => row.slotStart);
  }
}
