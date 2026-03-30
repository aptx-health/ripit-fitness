import { betterAuth } from "better-auth"
import { Pool } from "pg"
import { Resend } from "resend"
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
        "/forget-password": { window: 60, max: 100 },
        "/reset-password": { window: 60, max: 100 },
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
    sendResetPassword: async ({ user, url }) => {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const from = process.env.EMAIL_FROM || "noreply@ripit.fit"
      const { error } = await resend.emails.send({
        from: `Ripit Fitness <${from}>`,
        to: user.email,
        subject: "Reset your password",
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset for your Ripit Fitness account.</p>
          <p><a href="${url}">Click here to reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
      })
      if (error) {
        logger.error({ error, userId: user.id }, "Failed to send password reset email")
      }
    },
    resetPasswordTokenExpiresIn: 3600, // 1 hour
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
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
