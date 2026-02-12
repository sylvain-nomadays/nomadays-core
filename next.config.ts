import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase proxy timeout for long-running API calls (AI suggestions, etc.)
  // Default is 30s which is too short for Claude AI + geocoding (~40s)
  experimental: {
    proxyTimeout: 120_000, // 2 minutes
  },
  // Proxy API requests to avoid CORS and browser blocking issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
    ];
  },
};

export default nextConfig;
