import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'pdfmake'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/pdf/[id]': ['./public/fonts/**'],
    },
  },
};

export default nextConfig;
