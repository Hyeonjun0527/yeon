import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_URL?.includes("dev.")
    ? "development"
    : "production",
  tracesSampleRate: 1.0,
  enabled: process.env.NODE_ENV === "production",
});
