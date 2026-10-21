import { contactSchema } from "@/shared/schemas";
import { getContainer } from "@/server/container";
import { handleRoute, readBody } from "@/server/http/handleRoute";
import { consumeQuota } from "@/server/repositories/PrismaBookingRepository";
import { istDay } from "@/server/policies/BusinessHoursPolicy";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleRoute(async () => {
    const { website: _honeypot, ...data } = contactSchema.parse(await readBody(request));
    const { prisma } = getContainer();
    await prisma.$transaction(async tx => { await consumeQuota(tx, `contact:${data.email}:${istDay(new Date())}`, 5); await tx.contactMessage.create({ data }); });
    return { received: true };
  }, 201);
}
