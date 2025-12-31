import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

export class TestDatabase {
  private container?: StartedPostgreSqlContainer
  private prisma?: PrismaClient
  private originalDatabaseUrl?: string
  private originalDirectUrl?: string

  async start() {
    console.log('🐘 Starting PostgreSQL test container...')
    
    // Store original environment variables to restore later
    this.originalDatabaseUrl = process.env.DATABASE_URL
    this.originalDirectUrl = process.env.DIRECT_URL

    // Start PostgreSQL 15 container (matching Supabase version)
    this.container = await new PostgreSqlContainer('postgres:15')
      .withDatabase('fitcsv_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .withExposedPorts(5432)
      .start()

    // Get connection URL from container
    const connectionString = this.container.getConnectionUri()
    console.log('📡 Container started, connection string:', connectionString)

    // Set environment variables for Prisma (both DATABASE_URL and DIRECT_URL to same container)
    process.env.DATABASE_URL = connectionString
    process.env.DIRECT_URL = connectionString

    try {
      // Push schema to get fresh test database (faster than migrations for testing)
      console.log('🔄 Pushing Prisma schema to test database...')
      execSync('npx prisma db push --force-reset', { 
        stdio: 'pipe', 
        env: { 
          ...process.env, 
          DATABASE_URL: connectionString,
          DIRECT_URL: connectionString
        }
      })
      console.log('✅ Schema push completed')

      // Create Prisma client for the test database
      this.prisma = new PrismaClient({
        datasources: { 
          db: { url: connectionString } 
        },
        log: ['error'] // Only log errors in tests
      })

      // Verify connection
      await this.prisma.$connect()
      console.log('🔌 Prisma client connected to test database')

      return { 
        prisma: this.prisma, 
        connectionString,
        container: this.container 
      }
    } catch (error) {
      console.error('❌ Failed to setup test database:', error)
      await this.cleanup()
      throw error
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test database...')
    
    try {
      if (this.prisma) {
        await this.prisma.$disconnect()
        console.log('📤 Prisma client disconnected')
      }
    } catch (error) {
      console.warn('⚠️ Error disconnecting Prisma client:', error)
    }

    try {
      if (this.container) {
        await this.container.stop()
        console.log('🛑 Container stopped')
      }
    } catch (error) {
      console.warn('⚠️ Error stopping container:', error)
    }

    // Restore original environment variables
    if (this.originalDatabaseUrl) {
      process.env.DATABASE_URL = this.originalDatabaseUrl
    } else {
      delete process.env.DATABASE_URL
    }
    
    if (this.originalDirectUrl) {
      process.env.DIRECT_URL = this.originalDirectUrl
    } else {
      delete process.env.DIRECT_URL
    }

    console.log('✅ Test database cleanup completed')
  }

  async reset() {
    if (!this.prisma) {
      throw new Error('Database not started. Call start() first.')
    }

    console.log('🔄 Resetting test database...')
    
    // Clear all data in reverse order to handle foreign key constraints
    const tablesToClear = [
      'LoggedSet',
      'WorkoutCompletion', 
      'PrescribedSet',
      'Exercise',
      'ExerciseDefinition',
      'Workout',
      'Week',
      'Program'
    ]

    for (const table of tablesToClear) {
      try {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
      } catch (error) {
        console.warn(`⚠️ Error clearing table ${table}:`, error)
      }
    }
    
    console.log('✅ Test database reset completed')
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
    globalTestDb = new TestDatabase()
    await globalTestDb.start()
  }
  return globalTestDb
}

export async function cleanupTestDatabase(): Promise<void> {
  if (globalTestDb) {
    await globalTestDb.cleanup()
    globalTestDb = null
  }
}