import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mathjs'],
  },
};

export default nextConfig;
