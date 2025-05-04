const path = require('path');
const { i18n } = require('./next-i18next.config');

const nextConfig = {
  i18n,
  transpilePackages: ['@wealthlog/common'],
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
    config.resolve.alias['@wealthlog/common'] = path.resolve(__dirname, '../../packages/common/src');
    return config;
  },
};

module.exports = nextConfig;