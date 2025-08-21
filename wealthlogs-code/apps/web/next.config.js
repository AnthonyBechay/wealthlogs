const path = require('path');
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  i18n,
  transpilePackages: ['@wealthlog/shared', '@wealthlog/ui'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://localhost:5000/auth/:path*',
      },
    ];
  },
  webpack(config) {
    // Resolve shared packages
    config.resolve.alias['@wealthlog/shared'] = path.resolve(__dirname, '../../packages/shared/src');
    config.resolve.alias['@wealthlog/ui'] = path.resolve(__dirname, '../../packages/ui/src');
    return config;
  },
};

module.exports = nextConfig;
