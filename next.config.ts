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

// Security headers applied to all routes
const securityHeaders = [
  {
    // Prevent clickjacking by disallowing framing
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    // Prevent MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Control referrer information sent with requests
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Enforce HTTPS (1 year, include subdomains)
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  {
    // Restrict browser feature access
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  {
    // Content Security Policy
    // 'unsafe-inline' required for theme initialization scripts and Next.js inline styles
    // 'unsafe-eval' required for Next.js development mode hot reload
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://cdn.ripit.fit data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
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
