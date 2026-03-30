import type { NextConfig } from 'next';

type WebpackServerConfig = {
  externals?: unknown;
};

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  /** Driver must not be bundled (CSFLE / Node built-ins). */
  serverExternalPackages: ['mongodb'],
  webpack: (config: WebpackServerConfig, { isServer }: { isServer: boolean }) => {
    if (isServer && Array.isArray(config.externals)) {
      config.externals.push('mongodb');
    }
    return config;
  },
};

export default nextConfig;
