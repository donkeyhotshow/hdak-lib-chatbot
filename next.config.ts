import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  // M40: apply security headers in dev too, not only on Vercel
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  experimental: {
    // L17: remove framer-motion — it uses its own ESM tree-shaking
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
