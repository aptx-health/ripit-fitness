import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize server-only packages to prevent bundling in client/edge
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
    'sonic-boom',
    'pino-std-serializers',
    'pino-abstract-transport',
  ],
  // Empty Turbopack config to silence webpack config warning
  // Turbopack automatically handles Node.js module exclusions in browser builds
  turbopack: {},
  // Keep webpack config for backward compatibility when using --webpack flag
  webpack: (config) => {
    // Add fallbacks for Node.js modules not available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;
