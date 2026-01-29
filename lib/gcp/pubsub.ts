import { PubSub } from '@google-cloud/pubsub'
import { OAuth2Client } from 'google-auth-library'

const TOPIC_NAME = 'program-clone-jobs'

export interface ProgramCloneJob {
  communityProgramId: string
  programId: string
  userId: string
  programType: 'strength' | 'cardio'
}

/**
 * Creates a PubSub client configured for the current environment.
 * In test/local with emulator: PUBSUB_EMULATOR_HOST is set, auth is ignored.
 * In production (Vercel): uses GCP_SERVICE_ACCOUNT_KEY credentials.
 */
function createPubSubClient(): PubSub {
  if (process.env.PUBSUB_EMULATOR_HOST) {
    // Emulator mode — suppress ADC lookup warning with dummy authClient
    const authClient = new OAuth2Client()
    authClient.setCredentials({ access_token: 'emulator' })

    return new PubSub({
      projectId: process.env.PUBSUB_PROJECT_ID || 'test-project',
      authClient,
    })
  }

  const key = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (!key) {
    throw new Error('GCP_SERVICE_ACCOUNT_KEY is not set')
  }

  return new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
    credentials: JSON.parse(key),
  })
}

/**
 * Publishes a program clone job to the Pub/Sub topic.
 * The Cloud Run worker picks this up via Eventarc and processes the clone.
 */
export async function publishProgramCloneJob(job: ProgramCloneJob): Promise<string> {
  const pubsub = createPubSubClient()
  const topic = pubsub.topic(TOPIC_NAME)

  const messageBuffer = Buffer.from(JSON.stringify(job))
  const messageId = await topic.publishMessage({ data: messageBuffer })

  console.log(`Published clone job for program ${job.programId}: messageId=${messageId}`)
  return messageId
}
