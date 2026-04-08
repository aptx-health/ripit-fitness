// Prisma database client
import { PrismaClient } from '@prisma/client'
import { assertPgBouncerConfig } from './db/assert-pgbouncer'
import { logger } from './logger'

// Validate PgBouncer config before instantiating the client. In production
// this throws on misconfiguration; in dev/test it logs a warning.
assertPgBouncerConfig(process.env, { logger })

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
