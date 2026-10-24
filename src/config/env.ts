import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);
const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .url()
    .refine((value) => /^https?:\/\//.test(value), "Use an HTTP(S) URL")
    .optional(),
);

export const envSchema = z
  .object({
    APP_ENV: z
      .enum(["development", "preview", "production"])
      .default("development"),
    NEXT_PUBLIC_SITE_URL: optionalUrl,
    NEXT_PUBLIC_GET_STARTED_URL: optionalUrl,
    NEXT_PUBLIC_PRIVACY_URL: optionalUrl,
    NEXT_PUBLIC_TERMS_URL: optionalUrl,
    NEXT_PUBLIC_CALCOM_LINK: optionalText,
    NEXT_PUBLIC_GTM_ID: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z
        .string()
        .regex(/^GTM-[A-Z0-9]+$/)
        .optional(),
    ),
    DATABASE_URL: optionalText,
    DIRECT_URL: optionalText,
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalText,
    RESEND_API_KEY: optionalText,
    EMAIL_FROM: optionalText,
    CALCOM_WEBHOOK_SECRET: optionalText,
    CRM_ADAPTER: z.enum(["mock", "http", "sheets"]).default("mock"),
    CRM_BASE_URL: optionalUrl,
    CRM_CONTRACT_VERIFIED: z.enum(["true", "false"]).default("false"),
    CRM_API_KEY: optionalText,
    CRON_SECRET: optionalText,
    SENTRY_DSN: optionalUrl,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
    SENTRY_ORG: optionalText,
    SENTRY_PROJECT: optionalText,
    SENTRY_AUTH_TOKEN: optionalText,
    NEXT_PUBLIC_CONTACT_EMAIL: optionalText,
    NEXT_PUBLIC_CONTACT_PHONE: optionalText,
    ROUTE_QUALIFIER_EMAIL: optionalText,
    ROUTE_PRESENTER_EMAILS: optionalText,
    ROUTE_CLOSING_EMAILS: optionalText,
    META_API_VERSION: z
      .string()
      .regex(/^v[0-9]+\.[0-9]+$/)
      .default("v23.0"),
    META_CAPI_TOKEN: optionalText,
    NEXT_PUBLIC_CALCOM_NAMESPACE: z.string().default("demo"),
    META_PIXEL_ID: optionalText,
    META_CAPI_ACCESS_TOKEN: optionalText,
    META_TEST_EVENT_CODE: optionalText,
  })
  .superRefine((env, ctx) => {
    const require = (key: keyof typeof env) => {
      if (!env[key])
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Required for this configuration",
        });
    };
    if (env.CRM_ADAPTER === "http") {
      require("CRM_BASE_URL");
      require("CRM_API_KEY");
    }
    if (env.CRM_ADAPTER === "sheets") {
      ctx.addIssue({
        code: "custom",
        path: ["CRM_ADAPTER"],
        message:
          "Sheets adapter is not implemented; use mock until integration is available",
      });
    }
    if (env.APP_ENV === "production") {
      (
        [
          "NEXT_PUBLIC_SITE_URL",
          "NEXT_PUBLIC_PRIVACY_URL",
          "NEXT_PUBLIC_TERMS_URL",
          "DATABASE_URL",
          "DIRECT_URL",
          "UPSTASH_REDIS_REST_URL",
          "UPSTASH_REDIS_REST_TOKEN",
          "RESEND_API_KEY",
          "EMAIL_FROM",
          "NEXT_PUBLIC_CALCOM_LINK",
          "CALCOM_WEBHOOK_SECRET",
          "CRON_SECRET",
          "NEXT_PUBLIC_CONTACT_EMAIL",
          "ROUTE_QUALIFIER_EMAIL",
          "ROUTE_PRESENTER_EMAILS",
        ] as const
      ).forEach(require);
      if (env.CRM_CONTRACT_VERIFIED !== "true")
        ctx.addIssue({
          code: "custom",
          path: ["CRM_CONTRACT_VERIFIED"],
          message:
            "Verify the CRM mapping and idempotency contract before production",
        });
      if (env.CRM_ADAPTER !== "http")
        ctx.addIssue({
          code: "custom",
          path: ["CRM_ADAPTER"],
          message: "Production requires the real HTTP CRM adapter",
        });
    }
  });

/** Validate server configuration without exposing values in error messages. */
export function parseEnv(input: Record<string, string | undefined>) {
  const result = envSchema.safeParse({
    ...input,
    APP_ENV:
      input.APP_ENV ||
      (input.VERCEL_ENV === "production"
        ? "production"
        : input.VERCEL_ENV === "preview"
          ? "preview"
          : "development"),
  });
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${result.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n")}`,
    );
  }
  return result.data;
}
