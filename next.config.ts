import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // ── Runtime / output ─────────────────────────────────────────
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  // Strip console.* in production builds (keep error/warn so logger pipeline still sees them)
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },

  // ── Bundle / package optimization ────────────────────────────
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "framer-motion",
      "radix-ui",
    ],
  },

  // ── Images ───────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24, // 1 day
    remotePatterns: [
      // Supabase storage (any project)
      { protocol: "https", hostname: "*.supabase.co" },
      // Hospital / partner image hosts
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "gleneagles.com.my" },
      { protocol: "https", hostname: "www.rspondokindah.co.id" },
      { protocol: "https", hostname: "princecourt.com" },
      { protocol: "https", hostname: "www.pantai.com.my" },
      { protocol: "https", hostname: "www.sunwaymedical.com" },
      { protocol: "https", hostname: "images.contentstack.io" },
      { protocol: "https", hostname: "ihh.listedcompany.com" },
      { protocol: "https", hostname: "www.columbiaasia.com" },
    ],
  },

  // ── Security headers ─────────────────────────────────────────
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Long-cache static assets
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // No-store for all API routes (we cache via Redis, never via CDN)
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

// ── Sentry wrapper ─────────────────────────────────────────────
// Wraps the Next.js config with Sentry's webpack plugin: uploads source maps
// at build time (when SENTRY_AUTH_TOKEN is set), tunnels client requests to
// avoid ad-blockers, and silences build warnings in CI.
//
// All Sentry options are no-ops if SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN are not
// set, so this is safe to keep enabled in dev / preview.
export default withSentryConfig(nextConfig, {
  org: "flelab-j4",
  project: "javascript-nextjs",

  // Suppress source-map upload logs in CI builds.
  silent: !process.env.CI,

  // Upload a larger set of source maps for better stack traces.
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to avoid
  // being blocked by ad-blockers. Adds latency to client requests but
  // dramatically improves error capture rate.
  tunnelRoute: "/monitoring",

  // Hide source maps from generated client bundles (Sentry v10 API).
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tree-shake Sentry logger statements so they don't ship to clients.
  disableLogger: true,

  // Enable Vercel Cron Monitors automatically.
  automaticVercelMonitors: true,
});
