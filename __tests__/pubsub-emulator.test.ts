/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PubSub } from '@google-cloud/pubsub';
import { startPubSubEmulator, stopPubSubEmulator } from '@/lib/test/pubsub-emulator';

describe('Pub/Sub Emulator - Hello World', () => {
  beforeAll(async () => {
    await startPubSubEmulator();
  }, 30000);

  afterAll(async () => {
    await stopPubSubEmulator();
  }, 10000);

  it('should publish and receive a message', async () => {
    const pubsub = new PubSub({
      projectId: process.env.PUBSUB_PROJECT_ID || 'test-project'
    });

    const topicName = 'test-topic-' + Date.now();
    const subscriptionName = 'test-sub-' + Date.now();

    // Create topic and subscription
    const [topic] = await pubsub.createTopic(topicName);
    const [subscription] = await topic.createSubscription(subscriptionName);

    // Set up listener
    let receivedMessage: string | null = null;
    subscription.on('message', (message) => {
      receivedMessage = message.data.toString();
      message.ack();
    });

    // Publish message
    await topic.publishMessage({
      data: Buffer.from('Hello from test!')
    });

    // Wait for message to be received
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Assert
    expect(receivedMessage).toBe('Hello from test!');

    // Cleanup
    await subscription.delete();
    await topic.delete();
  }, 10000);
});
