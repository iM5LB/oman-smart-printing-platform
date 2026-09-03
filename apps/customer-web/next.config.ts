import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@omsp/shared', '@omsp/types'],
};

export default nextConfig;
