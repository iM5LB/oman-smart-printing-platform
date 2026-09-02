import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@omsp/shared', '@omsp/types'],
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/favicon.svg' }];
  },
};

export default nextConfig;
