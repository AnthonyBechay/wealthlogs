// apps/web/next.config.ts
import type { NextConfig } from 'next';
import { i18n } from './next-i18next.config';

const nextConfig: NextConfig = {
  i18n,
  transpilePackages: ['@wealthlog/common'],
  eslint: {
    // ✅ Ignore ESLint errors during production builds (for Vercel)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Ignore TypeScript build errors (optional for dev stage)
    ignoreBuildErrors: true,
  },
  rewrites: async () => [
    {
      source: '/auth/:path*',
      destination: 'http://localhost:5000/auth/:path*',
    },
  ],
};

export default nextConfig;
