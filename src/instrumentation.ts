export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseEnv } = await import("./config/env");
    parseEnv(process.env);
    if (process.env.SENTRY_DSN) {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0,
        beforeSend(event) {
          delete event.request;
          delete event.user;
          delete event.breadcrumbs;
          return event;
        },
      });
    }
  }
}
export async function onRequestError() {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureMessage("Unhandled Next.js request error", { level: "error" });
}
