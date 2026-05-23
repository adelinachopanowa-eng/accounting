import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), '@react-pdf/renderer'];
    }
    return config;
  },
  experimental: {
    outputFileTracingIncludes: {
      '/api/pdf/[id]': ['./public/fonts/**'],
    },
  },
};

export default nextConfig;
