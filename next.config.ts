import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/pdf/[id]': ['./public/fonts/**'],
  },
};

export default nextConfig;
