import { PrismaClient } from "@prisma/client";
const globalCache = globalThis as unknown as { prisma?: PrismaClient };
export function getPrisma() {
  const client = globalCache.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalCache.prisma = client;
  return client;
}
