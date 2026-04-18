// Next.js instrumentation hook. Loads the right Sentry runtime config based
// on the environment Next is booting in.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Sentry v10+ renamed onRequestError → captureRequestError. Re-export under
// Next.js's expected name so the framework wires it automatically.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
