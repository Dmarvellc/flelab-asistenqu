import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jzupwygwzatugbrmqjau.supabase.co',
      },
    ],
  },
};

export default nextConfig;
