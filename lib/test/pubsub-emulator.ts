import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';

const EMULATOR_PORT = 8681;

let container: StartedTestContainer | null = null;

/**
 * Starts the Pub/Sub emulator via Testcontainers.
 * Uses messagebird/gcloud-pubsub-emulator (publicly available, no GCP auth needed).
 * Works in both local dev and CI (just needs Docker).
 */
export async function startPubSubEmulator(): Promise<void> {
  console.log('🚀 Starting Pub/Sub emulator container...');

  container = await new GenericContainer('messagebird/gcloud-pubsub-emulator:latest')
    .withExposedPorts(EMULATOR_PORT)
    .withWaitStrategy(Wait.forLogMessage(/Server started/))
    .withStartupTimeout(30000)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(EMULATOR_PORT);
  process.env.PUBSUB_EMULATOR_HOST = `${host}:${port}`;

  console.log(`✅ Pub/Sub emulator running at ${host}:${port}`);
}

/**
 * Stops the Pub/Sub emulator container
 */
export async function stopPubSubEmulator(): Promise<void> {
  if (container) {
    console.log('🛑 Stopping Pub/Sub emulator container...');
    await container.stop();
    delete process.env.PUBSUB_EMULATOR_HOST;
    container = null;
    console.log('✅ Pub/Sub emulator stopped');
  }
}
