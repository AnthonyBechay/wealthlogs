const path = require('path');
const withNextIntl = require('next-intl/plugin')();

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@wealthlog/common'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.resolve.alias['@wealthlog/common'] = path.resolve(__dirname, '../../packages/common/src');
    return config;
  },
};

module.exports = withNextIntl(nextConfig);