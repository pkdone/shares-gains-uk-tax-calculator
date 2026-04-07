import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  /** Driver must not be bundled (CSFLE / Node built-ins). */
  serverExternalPackages: ['mongodb', 'better-auth', '@better-auth/mongo-adapter', 'pdf-parse'],
  webpack: (config: Configuration, { isServer }): Configuration => {
    if (isServer && Array.isArray(config.externals)) {
      config.externals.push('mongodb');
    }
    return config;
  },
};

export default nextConfig;
