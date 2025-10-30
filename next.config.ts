import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Future-friendly; can toggle as needed
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;


