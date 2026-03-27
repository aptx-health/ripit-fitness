import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { logger } from "@/lib/logger"

const isRelaxedRateLimits = process.env.RELAXED_RATE_LIMITS === "true"

if (isRelaxedRateLimits) {
  logger.warn("BetterAuth rate limits relaxed — 100 req/60s for auth endpoints")
}

const rateLimitConfig = isRelaxedRateLimits
  ? {
      customRules: {
        "/sign-up/*": { window: 60, max: 100 },
        "/sign-in/*": { window: 60, max: 100 },
        "/change-password": { window: 60, max: 100 },
        "/change-email": { window: 60, max: 100 },
      },
    }
  : undefined

// Allow Vercel preview deploy origins alongside the configured BETTER_AUTH_URL
const trustedOrigins = [
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  // Vercel sets VERCEL_URL (deployment-specific) and VERCEL_BRANCH_URL (branch alias)
  ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => {
        const bcrypt = await import("bcrypt")
        return bcrypt.default.hash(password, 10)
      },
      verify: async ({ hash, password }: { hash: string; password: string }) => {
        const bcrypt = await import("bcrypt")
        return bcrypt.default.compare(password, hash)
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
        input: false, // users cannot set their own role via signup
      },
    },
  },
  advanced: {
    database: {
      generateId: false, // Use database default (uuid) — allows explicit ID setting in B2 migration
    },
  },
  ...(rateLimitConfig && { rateLimit: rateLimitConfig }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min
    },
  },
})
