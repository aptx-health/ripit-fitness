import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { inject } from 'vitest'

const TEMPLATE_DB = 'ripit_template'

/**
 * Deletes every row in every table in one round trip. FK checks are switched
 * off for the statement, so table order doesn't matter, and new tables are
 * covered without being listed. DELETE is used because TRUNCATE rebuilds
 * each table's files on disk, which is ~25x slower on tiny test tables.
 */
const RESET_SQL = `DO $$ DECLARE r record; BEGIN
  SET LOCAL session_replication_role = replica;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP EXECUTE 'DELETE FROM ' || quote_ident(r.tablename); END LOOP;
END $$`

/**
 * One database per test file, cloned from the template that global-setup
 * pushed the schema into. All files share the run's single Postgres container.
 */
export class TestDatabase {
  private prisma?: PrismaClient
  private admin?: PrismaClient
  private dbName?: string
  private originalDatabaseUrl?: string
  private originalDirectUrl?: string

  async start() {
    this.originalDatabaseUrl = process.env.DATABASE_URL
    this.originalDirectUrl = process.env.DIRECT_URL

    const adminUrl = inject('pgAdminUrl')
    if (!adminUrl) throw new Error('No test Postgres: lib/test/global-setup.ts did not run')
    const url = new URL(adminUrl)
    if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
      throw new Error(`SAFETY CHECK FAILED: test database must be on localhost, got ${url.hostname}`)
    }

    this.admin = new PrismaClient({ datasources: { db: { url: adminUrl } }, log: ['error'] })
    this.dbName = `file_${randomBytes(6).toString('hex')}`
    await this.admin.$executeRawUnsafe(`CREATE DATABASE "${this.dbName}" TEMPLATE ${TEMPLATE_DB}`)

    url.pathname = `/${this.dbName}`
    const connectionString = url.toString()
    // Code under test that builds its own client reads these.
    process.env.DATABASE_URL = connectionString
    process.env.DIRECT_URL = connectionString

    this.prisma = new PrismaClient({ datasources: { db: { url: connectionString } }, log: ['error'] })
    await this.prisma.$connect()
    return { prisma: this.prisma, connectionString }
  }

  async cleanup() {
    try {
      await this.prisma?.$disconnect()
      if (this.dbName) await this.admin?.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${this.dbName}" WITH (FORCE)`)
      await this.admin?.$disconnect()
    } catch (error) {
      console.warn('⚠️ Error cleaning up test database:', error)
    }

    // Restore original environment variables
    if (this.originalDatabaseUrl) process.env.DATABASE_URL = this.originalDatabaseUrl
    else delete process.env.DATABASE_URL
    if (this.originalDirectUrl) process.env.DIRECT_URL = this.originalDirectUrl
    else delete process.env.DIRECT_URL
  }

  async reset() {
    if (!this.prisma) {
      throw new Error('Database not started. Call start() first.')
    }
    await this.prisma.$executeRawUnsafe(RESET_SQL)
  }

  getPrismaClient() {
    if (!this.prisma) {
      throw new Error('Database not started. Call start() first.')
    }
    return this.prisma
  }
}

// Global test database instance for reuse across tests
let globalTestDb: TestDatabase | null = null

export async function getTestDatabase(): Promise<TestDatabase> {
  if (!globalTestDb) {
    const db = new TestDatabase()
    await db.start()
    // Only assign after successful start so a failed attempt can be retried
    globalTestDb = db
  }
  return globalTestDb
}

export async function cleanupTestDatabase(): Promise<void> {
  if (globalTestDb) {
    await globalTestDb.cleanup()
    globalTestDb = null
  }
}
