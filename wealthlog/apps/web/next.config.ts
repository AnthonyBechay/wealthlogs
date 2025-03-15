// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@wealthlog/common"],
  rewrites: async () => [
    {
      source: '/auth/:path*',
      destination: 'http://localhost:5000/auth/:path*'
    }
  ]
};

export default nextConfig;
