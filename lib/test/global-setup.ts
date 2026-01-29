/**
 * Global setup - runs once before all test files
 *
 * Note: This runs in a separate process from tests,
 * so env vars set here don't propagate. Per-test setup
 * (e.g., Pub/Sub emulator) should be done in beforeAll/afterAll.
 */
export async function setup() {
  console.log('🌍 Global test setup complete');
}

export async function teardown() {
  console.log('🌍 Global test teardown complete');
}
