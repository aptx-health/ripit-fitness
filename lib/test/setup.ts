import { afterAll, beforeAll } from 'vitest'
import { cleanupTestDatabase, getTestDatabase } from './database'

// Global setup - start test database once for all test suites
beforeAll(async () => {
  console.log('🚀 Starting test environment...')
  
  // Ensure Docker is available
  try {
    const { execSync } = await import('node:child_process')
    execSync('docker --version', { stdio: 'pipe' })
    console.log('✅ Docker is available')
  } catch {
    console.error('❌ Docker is not available or not running')
    console.error('Please make sure Docker is installed and running')
    process.exit(1)
  }
  
  // Start the test database
  try {
    await getTestDatabase()
    console.log('✅ Test environment ready')
  } catch (e) {
    console.warn('⚠️ Database setup failed — tests requiring DB will fail:', (e as Error).message)
  }
}, 120000) // 2 minute timeout for container startup

// Global cleanup - stop test database after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...')
  await cleanupTestDatabase()
  console.log('✅ Test environment cleanup completed')
}, 60000) // 1 minute timeout for cleanup