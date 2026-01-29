import { PubSub, Topic, Subscription } from '@google-cloud/pubsub';

const PROJECT_ID = process.env.PUBSUB_PROJECT_ID || 'test-project';

/**
 * Creates a Pub/Sub client that automatically connects to the emulator
 * if PUBSUB_EMULATOR_HOST is set in the environment
 */
export function createPubSubClient(): PubSub {
  return new PubSub({ projectId: PROJECT_ID });
}

/**
 * Creates a topic for testing
 */
export async function createTestTopic(topicName: string): Promise<Topic> {
  const pubsub = createPubSubClient();
  const topic = pubsub.topic(topicName);

  const [exists] = await topic.exists();
  if (!exists) {
    await topic.create();
  }

  return topic;
}

/**
 * Creates a subscription for testing
 */
export async function createTestSubscription(
  topicName: string,
  subscriptionName: string
): Promise<Subscription> {
  const pubsub = createPubSubClient();
  const topic = pubsub.topic(topicName);
  const subscription = topic.subscription(subscriptionName);

  const [exists] = await subscription.exists();
  if (!exists) {
    await subscription.create();
  }

  return subscription;
}

/**
 * Publishes a message to a topic
 */
export async function publishMessage(
  topicName: string,
  data: Record<string, any>,
  attributes?: Record<string, string>
): Promise<string> {
  const topic = await createTestTopic(topicName);
  const dataBuffer = Buffer.from(JSON.stringify(data));

  const messageId = await topic.publishMessage({
    data: dataBuffer,
    attributes: attributes || {},
  });

  return messageId;
}

/**
 * Listens for messages on a subscription
 * Returns a promise that resolves with the first message received
 */
export async function receiveMessage(
  subscriptionName: string,
  timeoutMs: number = 5000
): Promise<{ data: any; attributes: Record<string, string> }> {
  const pubsub = createPubSubClient();
  const subscription = pubsub.subscription(subscriptionName);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscription.removeAllListeners();
      reject(new Error(`Timeout waiting for message after ${timeoutMs}ms`));
    }, timeoutMs);

    subscription.on('message', (message) => {
      clearTimeout(timeout);
      subscription.removeAllListeners();

      const data = JSON.parse(message.data.toString());
      message.ack();

      resolve({
        data,
        attributes: message.attributes,
      });
    });

    subscription.on('error', (error) => {
      clearTimeout(timeout);
      subscription.removeAllListeners();
      reject(error);
    });
  });
}

/**
 * Cleans up test topics and subscriptions
 */
export async function cleanupPubSub(
  topicName?: string,
  subscriptionName?: string
): Promise<void> {
  const pubsub = createPubSubClient();

  if (subscriptionName) {
    try {
      await pubsub.subscription(subscriptionName).delete();
    } catch (error) {
      // Ignore if doesn't exist
    }
  }

  if (topicName) {
    try {
      await pubsub.topic(topicName).delete();
    } catch (error) {
      // Ignore if doesn't exist
    }
  }
}
