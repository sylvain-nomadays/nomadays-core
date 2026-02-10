import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
