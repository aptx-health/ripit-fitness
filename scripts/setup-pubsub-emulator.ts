/**
 * Sets up Pub/Sub emulator with required topics and subscriptions
 * Run this after starting the emulator and before starting the app/worker
 */

import { PubSub } from '@google-cloud/pubsub';
import { OAuth2Client } from 'google-auth-library';

async function setupEmulator() {
  // Suppress MetadataLookupWarning in emulator mode
  const authClient = new OAuth2Client();
  authClient.setCredentials({ access_token: 'emulator' });

  const pubsub = new PubSub({
    projectId: process.env.PUBSUB_PROJECT_ID || 'test-project',
    authClient,
  });

  const topicName = 'program-clone-jobs';
  const subscriptionName = 'program-clone-jobs-sub';

  try {
    // Create topic
    const [topic] = await pubsub.createTopic(topicName);
    console.log(`✅ Created topic: ${topicName}`);

    // Create subscription
    await topic.createSubscription(subscriptionName);
    console.log(`✅ Created subscription: ${subscriptionName}`);

    console.log('\n🎉 Pub/Sub emulator ready!');
  } catch (error: any) {
    if (error.code === 6) { // ALREADY_EXISTS
      console.log('⚠️  Topic/subscription already exists - emulator is ready');
    } else {
      console.error('❌ Failed to setup emulator:', error);
      process.exit(1);
    }
  }
}

setupEmulator();
