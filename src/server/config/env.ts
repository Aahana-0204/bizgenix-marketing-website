import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(), DIRECT_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(), EMAIL_FROM: z.string().default("BizGenix <onboarding@resend.dev>"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  BOOKING_DAILY_LIMIT: z.coerce.number().int().min(1).max(20).default(3),
  BOOKING_HOLIDAYS: z.string().default("").transform(value => value.split(",").map(day => day.trim()).filter(Boolean)),
});
export function getEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error("Server configuration is incomplete or invalid");
  return result.data;
}
