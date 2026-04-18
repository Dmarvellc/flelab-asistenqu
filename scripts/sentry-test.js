#!/usr/bin/env node
/**
 * One-off Sentry connectivity test.
 * Sends one test message + one test exception, then flushes and exits.
 *
 * Usage: node scripts/sentry-test.js
 */
require("dotenv").config({ path: ".env.local" });
const Sentry = require("@sentry/nextjs");

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (!dsn) {
  console.error("✗ SENTRY_DSN not set");
  process.exit(1);
}

Sentry.init({
  dsn,
  environment: "test-from-cli",
  tracesSampleRate: 1.0,
});

Sentry.captureMessage("Sentry connectivity test from CLI", "info");

try {
  throw new Error("Sentry test exception from scripts/sentry-test.js");
} catch (e) {
  Sentry.captureException(e, {
    tags: { source: "cli-smoke-test" },
  });
}

Sentry.flush(5000)
  .then((ok) => {
    console.log(ok ? "✓ Events flushed to Sentry" : "✗ Flush returned false");
    process.exit(ok ? 0 : 1);
  })
  .catch((err) => {
    console.error("✗ Flush error:", err.message);
    process.exit(1);
  });
