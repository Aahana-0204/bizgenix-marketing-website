import pino from "pino";
import * as Sentry from "@sentry/nextjs";
export const logger = pino({
  level: "info",
  base: undefined,
  redact: ["email", "phone", "name", "payload", "headers", "body", "err"],
});
export function reportFailure(code: string, id?: string) {
  logger.error({ code, id }, "Operation failed");
  Sentry.captureMessage(code, { level: "error", extra: { id } });
}
