import { PrismaClient } from "@prisma/client";
if (process.env.APP_ENV === "production")
  throw new Error("Seed is for development databases only");
const prisma = new PrismaClient();
try {
  const count = await prisma.lead.count();
  console.log(
    `Database ready: ${count} existing lead records. No fabricated leads were inserted.`,
  );
} finally {
  await prisma.$disconnect();
}
