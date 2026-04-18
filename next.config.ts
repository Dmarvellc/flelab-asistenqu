import type { NextConfig } from "next";

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

export default nextConfig;
