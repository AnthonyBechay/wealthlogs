// apps/web/next.config.ts
import type { NextConfig } from 'next';
import { i18n } from './next-i18next.config';  // adjust import if it's .js

const nextConfig: NextConfig = {
  i18n,
  transpilePackages: ['@wealthlog/common'],
  // your rewrites:
  rewrites: async () => [
    {
      source: '/auth/:path*',
      destination: 'http://localhost:5000/auth/:path*',
    },
  ],
};

export default nextConfig;
