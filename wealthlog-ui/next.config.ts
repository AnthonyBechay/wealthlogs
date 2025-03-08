import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = {
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://localhost:5000/auth/:path*'
      },
    ];
  },
};



export default nextConfig;



