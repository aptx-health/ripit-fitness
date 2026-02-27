import { betterAuth } from "better-auth"
import { Pool } from "pg"

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
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
