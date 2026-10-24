import * as Sentry from "@sentry/nextjs";
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
    beforeSend(event) {
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      event.message = "Client application error";
      if (event.exception)
        event.exception.values = event.exception.values?.map((value) => ({
          ...value,
          value: "Client application error",
        }));
      return event;
    },
  });
}
