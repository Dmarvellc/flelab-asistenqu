import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'jzupwygwzatugbrmqjau.supabase.co' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'gleneagles.com.my' },
      { protocol: 'https', hostname: 'www.rspondokindah.co.id' },
      { protocol: 'https', hostname: 'princecourt.com' },
      { protocol: 'https', hostname: 'www.pantai.com.my' },
      { protocol: 'https', hostname: 'www.sunwaymedical.com' },
      { protocol: 'https', hostname: 'images.contentstack.io' },
      { protocol: 'https', hostname: 'ihh.listedcompany.com' },
      { protocol: 'https', hostname: 'www.columbiaasia.com' },
    ],
  },
};

export default nextConfig;
