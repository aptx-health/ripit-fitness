# Clone Worker — Implementation Design

Design and deployment plan for the Cloud Run function that processes program clone jobs. See [overview.md](overview.md) for architecture context.

## Key Differences from Tutorial

| Tutorial | Clone Worker |
|----------|--------------|
| Generic message handler | Program clone job processor |
| No database access | Needs Prisma + Supabase connection |
| Simple message logging | Complex nested DB operations |
| Event-driven demo | Production background job queue |

## Cloud Run Function Code

Directory: `cloud-functions/clone-program/`

**package.json**:
```json
{
  "name": "clone-program-worker",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@prisma/client": "^6.19.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "prisma": "^6.19.0",
    "typescript": "^5.3.3"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**src/index.ts**:
```typescript
import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
app.use(express.json())

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
})

interface ProgramCloneJob {
  programId: string
  userId: string
  programData: any
  programType: 'strength' | 'cardio'
}

app.post('/', async (req, res) => {
  const message = req.body.message

  if (!message) {
    res.status(400).send('Bad Request: missing message')
    return
  }

  try {
    const data = Buffer.from(message.data, 'base64').toString()
    const job: ProgramCloneJob = JSON.parse(data)

    console.log(`Processing clone job: ${job.programId}`)

    // TODO: Import and call actual cloning logic
    // await cloneStrengthProgramData(prisma, job.programId, job.programData, job.userId)

    await prisma.program.update({
      where: { id: job.programId },
      data: { copyStatus: 'ready' },
    })

    console.log(`Clone job completed: ${job.programId}`)
    res.status(200).send('OK')
  } catch (error) {
    console.error('Clone job failed:', error)
    // Don't throw — let it retry via Pub/Sub dead-letter
    res.status(500).send('Error processing job')
  }
})

const port = process.env.PORT || 8080
app.listen(port, () => console.log(`Clone worker listening on port ${port}`))
```

**Dockerfile**:
```dockerfile
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --production
RUN npx prisma generate
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

Copy `prisma/schema.prisma` from the main repo into this function's `prisma/` directory.

## Performance Optimization: Batch INSERT Strategy

### Problem

The original implementation used Prisma's nested `create` operations, which generated ~28 INSERT queries per week:
- 1 INSERT for Week
- 3 INSERTs for Workouts (one per workout)
- 12 INSERTs for Exercises (one per exercise)
- 12 batch INSERTs for PrescribedSets (one per exercise using `createMany`)

For a 9-week program: **~250 total INSERT queries**, resulting in execution times of 45-60 seconds.

### Solution

Implemented raw SQL batch INSERTs with pre-generated CUIDs in `cloud-functions/clone-program/src/batch-insert.ts`:

**Query reduction: 4 INSERT queries per week**
- 1 batch INSERT for all Weeks
- 1 batch INSERT for all Workouts
- 1 batch INSERT for all Exercises
- 1 batch INSERT for all PrescribedSets

For a 9-week program: **~36 total INSERT queries** (86% reduction)

### Implementation Details

**CUID Generation:**
```typescript
import { createId } from '@paralleldrive/cuid2'

const weekId = createId()
const workoutIds = workouts.map(() => createId())
const exerciseIds = exercises.map(() => createId())
```

Pre-generating all IDs before batch INSERT maintains foreign key relationships without relying on database-generated IDs.

**Batch INSERT Pattern:**
```typescript
const workoutValues = weekData.workouts.map((workout, idx) => {
  return Prisma.sql`(
    ${ids.workouts[idx].id},
    ${workout.name},
    ${workout.dayNumber},
    ${ids.weekId},
    ${userId}
  )`
})

await tx.$executeRaw(Prisma.sql`
  INSERT INTO "Workout" (id, name, "dayNumber", "weekId", "userId")
  VALUES ${Prisma.join(workoutValues, ',')}
`)
```

**Performance Logging:**
```typescript
console.log(
  `Batch insert week ${weekData.weekNumber}: ${duration}ms ` +
  `(${workouts.length} workouts, ${exerciseCount} exercises, ${setCount} sets)`
)
```

### Results

**Production measurements:**
- Before: 60 seconds for large strength programs
- After: 10 seconds for large strength programs
- **83% reduction in clone time**

**Benefits:**
- 86% fewer database queries
- Reduced network roundtrips between worker and database
- Lower connection pool pressure on Supabase
- Faster transaction execution with bulk operations
- Same resilience guarantees (per-week transactions, idempotency checks)

### Files

- `cloud-functions/clone-program/src/batch-insert.ts` - Core batch INSERT logic
- `cloud-functions/clone-program/src/cloning.ts` - Cloning orchestration using batch inserts
- `__tests__/api/clone-worker.test.ts` - Integration tests validating correctness

## Deployment

```bash
cd cloud-functions/clone-program

gcloud run deploy clone-program \
  --source . \
  --region=us-central1 \
  --platform=managed \
  --timeout=540s \
  --memory=1Gi \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
  --no-allow-unauthenticated
```

Use the Supabase connection pooler URL for `DATABASE_URL`.

## Pub/Sub Topic + Trigger

```bash
# Create production topic
gcloud pubsub topics create program-clone-jobs

# Create Eventarc trigger
gcloud eventarc triggers create program-clone-trigger \
  --location=us-central1 \
  --destination-run-service=clone-program \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.pubsub.topic.v1.messagePublished" \
  --transport-topic=projects/ripit-fitness/topics/program-clone-jobs \
  --service-account=eventarc-trigger-sa@ripit-fitness.iam.gserviceaccount.com
```

## Next.js Publisher

**lib/gcp/pubsub.ts**:
```typescript
import { PubSub } from '@google-cloud/pubsub'

const pubsub = new PubSub({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY || '{}'),
})

export interface ProgramCloneJob {
  programId: string
  userId: string
  programData: any
  programType: 'strength' | 'cardio'
}

export async function publishProgramCloneJob(job: ProgramCloneJob) {
  const topic = pubsub.topic('program-clone-jobs')
  const messageBuffer = Buffer.from(JSON.stringify(job))
  const messageId = await topic.publishMessage({ data: messageBuffer })
  console.log(`Published clone job: ${messageId}`)
  return messageId
}
```

**Update lib/community/cloning.ts** — replace fire-and-forget with:
```typescript
import { publishProgramCloneJob } from '@/lib/gcp/pubsub'

// Publish to Pub/Sub instead of fire-and-forget
await publishProgramCloneJob({
  programId: shellProgram.id,
  userId: userId,
  programData: programData,
  programType: 'strength',
})
```

## Vercel Service Account

```bash
# Create service account
gcloud iam service-accounts create vercel-pubsub-publisher \
  --display-name="Vercel Pub/Sub Publisher"

# Grant publish permission on the topic
gcloud pubsub topics add-iam-policy-binding program-clone-jobs \
  --member="serviceAccount:vercel-pubsub-publisher@ripit-fitness.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Create key file
gcloud iam service-accounts keys create ~/vercel-key.json \
  --iam-account=vercel-pubsub-publisher@ripit-fitness.iam.gserviceaccount.com
```

Add to Doppler:
- `GCP_PROJECT_ID`: `ripit-fitness`
- `GCP_SERVICE_ACCOUNT_KEY`: Contents of `~/vercel-key.json`

## Common Issues

| Error | Fix |
|-------|-----|
| "Permission denied to publish" | Service account missing `pubsub.publisher` role |
| "Cloud Run function timeout" | Increase with `--timeout=540s` |
| "Database connection failed" | Use Supabase pooler URL, not direct connection |
| "Message not triggering function" | Check Eventarc trigger exists and SA has `run.invoker` |

## Debugging

```bash
# View Cloud Run logs
gcloud run logs read clone-program --region=us-central1 --limit=50
```

## Emergency Operations & Cost Control

### Stopping a Runaway Worker

If the worker starts behaving unexpectedly (infinite retries, hammering the database, etc.), stop it immediately:

**Option 1: Disable Eventarc trigger** (recommended — stops new invocations, preserves deployment):
```bash
gcloud eventarc triggers delete program-clone-trigger --location=us-central1
```

**Option 2: Set max instances to 0** (prevents any new invocations):
```bash
gcloud run services update clone-program \
  --region=us-central1 \
  --max-instances=0
```

**Option 3: Delete the service** (nuclear option):
```bash
gcloud run services delete clone-program --region=us-central1
```

**Option 4: Purge stuck Pub/Sub messages** (if retries are causing the issue):
```bash
# Create a temporary subscription to drain messages
gcloud pubsub subscriptions create temp-drain --topic=program-clone-jobs

# Purge all pending messages
gcloud pubsub subscriptions seek temp-drain --time=now

# Delete the temporary subscription
gcloud pubsub subscriptions delete temp-drain
```

### Cost Monitoring

Cloud Run only charges when actively processing requests — idle services cost $0. However, to prevent unexpected bills:

**View current Cloud Run costs**:
```bash
# Check recent invocations
gcloud run services describe clone-program --region=us-central1 --format="value(status.traffic[0].latestRevision)"

# View metrics (requires Cloud Monitoring API)
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"' \
  --project=ripit-fitness
```

**Set budget alerts** (recommended):
1. Go to **GCP Console → Billing → Budgets & alerts**
2. Create a budget with threshold alerts (e.g., alert at $10/month, $50/month)
3. Add email notifications

**Cost reality check**:
- Single clone job: ~30 seconds at 1 vCPU = $0.00072
- 1,000 clones/month = $0.72
- 10,000 failed retries = ~$7.20

The real protection is **Option 1** above — disabling the Eventarc trigger stops message delivery without losing the deployed service.

### Re-enabling After Emergency Stop

**Recreate Eventarc trigger**:
```bash
gcloud eventarc triggers create program-clone-trigger \
  --location=us-central1 \
  --destination-run-service=clone-program \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.pubsub.topic.v1.messagePublished" \
  --transport-topic=projects/ripit-fitness/topics/program-clone-jobs \
  --service-account=eventarc-trigger-sa@ripit-fitness.iam.gserviceaccount.com
```

**Re-enable max instances** (if set to 0):
```bash
gcloud run services update clone-program \
  --region=us-central1 \
  --max-instances=10  # or whatever limit makes sense
```
