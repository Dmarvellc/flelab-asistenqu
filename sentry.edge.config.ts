// This file configures the initialization of Sentry on the Edge runtime
// (used by middleware/proxy and Edge route handlers).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  enabled: !!DSN && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
});
