import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // React Compiler runs via Babel, which hangs `next dev` under Turbopack.
  // Keep it for production builds (Vercel), disable it for local dev.
  reactCompiler: process.env.NODE_ENV === 'production',
};

export default nextConfig;
