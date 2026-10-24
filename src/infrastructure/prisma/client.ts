import "server-only";
import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { db?: PrismaClient };
export function database() {
  return (globalDb.db ??= new PrismaClient({ log: [] }));
}
