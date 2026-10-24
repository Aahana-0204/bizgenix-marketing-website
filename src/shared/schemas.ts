import { z } from "zod";
import { formContent } from "@/content/landing";
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) =>
    v.replace(/[\s()-]/g, "").replace(/^(?:\+91|91)(?=[6-9]\d{9}$)/, ""),
  )
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  )
  .transform((v) => `+91${v}`);
const required = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} is required`)
    .max(120, "Use at most 120 characters");
export const leadSchema = z
  .object({
    kind: z.enum(["DEMO_BOOKING", "PLAN_ENQUIRY"]),
    full_name: required("Full name"),
    company_name: required("Company name"),
    work_email: z
      .email("Enter a valid email address")
      .max(254)
      .transform((v) => v.toLowerCase()),
    mobile: phoneSchema,
    industry: z.enum(formContent.industries).optional(),
    team_size: z.enum(formContent.teamSizes),
    interested_in: z.enum(formContent.interests).optional(),
    plan_interest: z.enum(formContent.plans).optional(),
    key_challenge: z.string().trim().max(2000).optional(),
    consent: z
      .boolean()
      .refine((v) => v, "Please agree to the contact and privacy terms"),
    website: z.string().max(200).optional(),
    attribution: z.record(z.string().max(40), z.string().max(2048)).optional(),
    analytics_consent: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "DEMO_BOOKING")
      for (const key of ["industry", "interested_in"] as const)
        if (!data[key])
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: "Please choose an option",
          });
    if (data.kind === "PLAN_ENQUIRY" && !data.plan_interest)
      ctx.addIssue({
        code: "custom",
        path: ["plan_interest"],
        message: "Choose a plan",
      });
  });
export type LeadInput = z.input<typeof leadSchema>;
export type ValidLead = z.output<typeof leadSchema>;
export const webhookSchema = z
  .object({
    triggerEvent: z.enum([
      "BOOKING_CREATED",
      "BOOKING_CONFIRMED",
      "BOOKING_RESCHEDULED",
      "BOOKING_CANCELLED",
      "BOOKING_REQUESTED",
    ]),
    createdAt: z.iso.datetime(),
    payload: z
      .object({
        uid: z.string().min(1).max(200),
        startTime: z.iso.datetime(),
        endTime: z.iso.datetime(),
        rescheduleUid: z.string().optional(),
        rescheduledFromUid: z.string().optional(),
        status: z.string().optional(),
        requiresConfirmation: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        attendees: z
          .array(
            z.object({ email: z.email(), timeZone: z.string().optional() }),
          )
          .min(1),
        organizer: z
          .object({
            name: z.string().optional(),
            email: z.email().optional(),
            timeZone: z.string().optional(),
          })
          .optional(),
        videoCallData: z.object({ url: z.string().optional() }).optional(),
        location: z.string().optional(),
      })
      .passthrough(),
  })
  .superRefine((e, ctx) => {
    if (new Date(e.payload.endTime) <= new Date(e.payload.startTime))
      ctx.addIssue({
        code: "custom",
        path: ["payload", "endTime"],
        message: "End must follow start",
      });
  });
export type CalEvent = z.infer<typeof webhookSchema>;
