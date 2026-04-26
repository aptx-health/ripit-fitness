import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  reloadOnOnline: false,
  cacheOnNavigation: true,
});

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.ripit.fit',
      },
    ],
  },
  // Externalize server-only packages to prevent bundling in client/edge
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
    'sonic-boom',
    'pino-std-serializers',
    'pino-abstract-transport',
    'better-auth',
    'pg',
    'dotenv',
  ],
  // Turbopack config required for Next.js 16 (used in dev via --turbopack flag)
  turbopack: {},
  // Webpack config used for production builds (--webpack flag) to support Serwist SW generation
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

export default withSentryConfig(withSerwist(nextConfig), {
  org: "aptx-health",
  project: "javascript-nextjs",

  // Suppress source map upload logs outside CI
  silent: !process.env.CI,

  // Route browser requests to avoid ad blockers
  tunnelRoute: "/sentry-tunnel",

  // Source maps upload disabled until SENTRY_AUTH_TOKEN is configured
  sourcemaps: {
    disable: true,
  },
});
