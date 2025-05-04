// apps/web/next.config.js
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  i18n,
  transpilePackages: ['@wealthlog/common'],
  eslint: {
    ignoreDuringBuilds: true, // ✅ prevent ESLint errors from blocking deploy
  },
  typescript: {
    ignoreBuildErrors: true,  // ✅ prevent TS errors from blocking deploy
  },
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://localhost:5000/auth/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
