import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers'

let container: StartedTestContainer | null = null

/**
 * Starts a Redis container via Testcontainers for testing.
 * Sets REDIS_URL in the environment for BullMQ to connect.
 */
export async function startRedisContainer(): Promise<void> {
  console.log('Starting Redis test container...')

  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .withStartupTimeout(30000)
    .start()

  const host = container.getHost()
  const port = container.getMappedPort(6379)
  process.env.REDIS_URL = `redis://${host}:${port}`

  console.log(`Redis test container running at ${host}:${port}`)
}

/**
 * Stops the Redis test container.
 */
export async function stopRedisContainer(): Promise<void> {
  if (container) {
    console.log('Stopping Redis test container...')
    await container.stop()
    delete process.env.REDIS_URL
    container = null
    console.log('Redis test container stopped')
  }
}
