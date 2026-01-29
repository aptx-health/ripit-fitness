/**
 * @vitest-environment node
 *
 * Minimal test to verify Pub/Sub message flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PubSub } from '@google-cloud/pubsub';
import { OAuth2Client } from 'google-auth-library';
import { startPubSubEmulator, stopPubSubEmulator } from '@/lib/test/pubsub-emulator';

describe('Pub/Sub Message Flow - Minimal', () => {
  let pubsub: PubSub;

  beforeAll(async () => {
    await startPubSubEmulator();

    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: 'emulator-test' });

    pubsub = new PubSub({
      projectId: 'test-project',
      authClient,
    });

    // Create topic
    await pubsub.createTopic('test-topic');
    console.log('✅ Created topic');
  }, 30000);

  afterAll(async () => {
    await stopPubSubEmulator();
  }, 10000);

  it('should receive message with subscription created BEFORE publish', async () => {
    const topic = pubsub.topic('test-topic');

    // Create subscription FIRST
    const [subscription] = await topic.createSubscription('test-sub-before');
    console.log('✅ Created subscription BEFORE publish');

    // Set up listener
    const messagePromise = new Promise<string>((resolve) => {
      subscription.on('message', (message) => {
        console.log('📨 Received message:', message.data.toString());
        message.ack();
        resolve(message.data.toString());
      });
    });

    // Publish message AFTER subscription exists
    await topic.publishMessage({
      data: Buffer.from('Hello World')
    });
    console.log('📤 Published message');

    // Wait for message
    const received = await Promise.race([
      messagePromise,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )
    ]);

    expect(received).toBe('Hello World');

    // Cleanup
    await subscription.close();
    await subscription.delete();
  }, 10000);

  it('should NOT receive message with subscription created AFTER publish', async () => {
    const topic = pubsub.topic('test-topic');

    // Publish FIRST
    await topic.publishMessage({
      data: Buffer.from('Too Late')
    });
    console.log('📤 Published message BEFORE subscription exists');

    // Create subscription AFTER (too late!)
    const [subscription] = await topic.createSubscription('test-sub-after');
    console.log('✅ Created subscription AFTER publish');

    // Set up listener
    const messagePromise = new Promise<string>((resolve) => {
      subscription.on('message', (message) => {
        console.log('📨 Received message:', message.data.toString());
        message.ack();
        resolve(message.data.toString());
      });
    });

    // This should timeout - message was published before subscription existed
    let didTimeout = false;
    try {
      await Promise.race([
        messagePromise,
        new Promise<string>((_, reject) =>
          setTimeout(() => {
            didTimeout = true;
            reject(new Error('Timeout'));
          }, 2000)
        )
      ]);
    } catch (error) {
      console.log('⏱️ Timed out as expected');
    }

    expect(didTimeout).toBe(true);

    // Cleanup
    await subscription.close();
    await subscription.delete();
  }, 10000);

  it('should receive message with subscription and listener BEFORE publish', async () => {
    const topic = pubsub.topic('test-topic');

    // Create subscription
    const [subscription] = await topic.createSubscription('test-sub-proper-order');
    console.log('✅ Created subscription');

    // Set up listener FIRST
    const messagePromise = new Promise<string>((resolve) => {
      subscription.on('message', (message) => {
        console.log('📨 Received message:', message.data.toString());
        message.ack();
        resolve(message.data.toString());
      });
    });
    console.log('✅ Set up listener');

    // Give listener time to attach
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now publish
    await topic.publishMessage({
      data: Buffer.from('Proper Order')
    });
    console.log('📤 Published message');

    // Wait for message
    const received = await Promise.race([
      messagePromise,
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 3000)
      )
    ]);

    expect(received).toBe('Proper Order');

    // Cleanup
    await subscription.close();
    await subscription.delete();
  }, 10000);
});
