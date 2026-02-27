import { betterAuth } from "better-auth"
import { Pool } from "pg"

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
  advanced: {
    database: {
      generateId: false, // Use database default (uuid) — allows explicit ID setting in B2 migration
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 min
    },
  },
})
