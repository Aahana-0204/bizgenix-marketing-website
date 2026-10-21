import { z } from "zod";

const text = (max: number) => z.string().trim().min(1, "This field is required").max(max).refine(value => !/[<>\x00-\x08]/.test(value), "Please use plain text");
export const interests = ["Growth Intelligence", "CRM", "ScaleOS", "Voice AI", "BizChat", "Custom solution"] as const;
export const detailsSchema = z.object({
  companyName: text(120),
  fullName: text(100),
  email: z.string().trim().toLowerCase().email("Enter a valid work email").max(254),
  mobile: z.string().trim().regex(/^\+91[6-9]\d{9}$/, "Use +91 followed by a valid 10-digit mobile number"),
  interest: z.enum(interests),
  message: z.string().trim().max(2000).refine(value => !/[<>]/.test(value), "Please use plain text").optional(),
  website: z.string().max(0, "Unable to submit this form").default(""),
});
export const bookingSchema = detailsSchema.extend({ slotStart: z.string().datetime({ offset: true }) });
export const contactSchema = z.object({ fullName: text(100), email: z.string().trim().toLowerCase().email().max(254), message: text(3000), website: z.string().max(0).default("") });
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => { const date = new Date(`${value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value); }, "Invalid date");
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export type BookingDetails = z.infer<typeof detailsSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type Slot = { start: string; end: string; available: boolean };
export type BookingResult = { id: string; fullName: string; email: string; slotStart: string; slotEnd: string; emailSent: boolean };
