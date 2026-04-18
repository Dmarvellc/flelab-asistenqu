// This file configures the initialization of Sentry on the server side
// (Node runtime). Loaded by Next.js via `instrumentation.ts`.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,

  enabled: !!DSN && process.env.NODE_ENV === "production",

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  // Don't capture expected client errors as exceptions.
  ignoreErrors: [
    "AuthError",
    "HospitalClaimError",
    "AgentClaimDocumentError",
    /^Unauthorized$/,
    /^Forbidden$/,
    /^Invalid request payload$/,
  ],

  beforeSend(event) {
    // Drop noise: 4xx-style client errors that propagate as Error.
    if (event.exception?.values?.[0]?.value?.match(/^(Unauthorized|Forbidden|Not Found)$/)) {
      return null;
    }
    return event;
  },
});
