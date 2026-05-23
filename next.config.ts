import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/pdf/[id]': ['./public/fonts/**', './public/template.pdf'],
  },
};

export default nextConfig;
