# AI Agent Architecture (GCP-Focused)

## Overview

FitCSV's AI workout generation system uses a **microservices architecture** with clear separation between control plane (Next.js app) and execution plane (AI Worker service), deployed on Google Cloud Platform.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Next.js App (Control Plane) - Vercel                   │
│ - User: "Generate 12-week powerlifting program"        │
│ - Creates AIJob record in Cloud SQL (Postgres)         │
│ - Enqueues task to Cloud Tasks                         │
│ - Returns job_id to user for polling                   │
└────────────────┬────────────────────────────────────────┘
                 │ enqueues via Cloud Tasks API
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Cloud Tasks (Job Queue)                                 │
│ - Managed task queue service (no infrastructure)        │
│ - Automatic retries with exponential backoff            │
│ - Rate limiting and throttling                          │
│ - Task scheduling (immediate or delayed)                │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP POST to worker endpoint
                 ▼
┌─────────────────────────────────────────────────────────┐
│ AI Worker Service - Cloud Run (Execution Plane)        │
│ - Receives task payload via HTTP POST                  │
│ - Authenticates via IAM (Cloud Tasks → Cloud Run)      │
│ - Runs LangGraph agent workflows                       │
│ - Calls multiple LLM providers (OpenAI, Anthropic)     │
│ - Executes type-safe tools (Zod schemas)               │
│ - Writes results to Cloud SQL via Prisma              │
│ - Updates AIJob status                                 │
│                                                         │
│ Features:                                              │
│ - Auto-scaling (0 to N instances)                      │
│ - Max 60 min execution time                            │
│ - Concurrent request handling                          │
│ - Integrated with Cloud Logging/Monitoring             │
└─────────────────────────────────────────────────────────┘

Supporting GCP Services:
┌────────────────────────────────────────────────────────┐
│ Cloud SQL (Postgres)                                   │
│ - Prisma database (programs, workouts, ai_jobs)       │
│ - Shared between Vercel app and Cloud Run worker      │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Secret Manager                                         │
│ - OPENAI_API_KEY, ANTHROPIC_API_KEY                   │
│ - DATABASE_URL                                         │
│ - Accessed by Cloud Run with IAM permissions          │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Artifact Registry                                      │
│ - Docker images for AI worker                          │
│ - Built via Cloud Build CI/CD pipeline                │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ Cloud Logging + Cloud Monitoring                       │
│ - Structured logs from Cloud Run                       │
│ - Metrics: job duration, success rate, LLM costs      │
│ - Alerts: job failures, high error rates              │
└────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Technologies
- **LangGraph**: Graph-based agentic workflows
- **Cloud Run**: Serverless container platform for AI worker
- **Cloud Tasks**: Managed task queue (GCP-native)
- **Cloud SQL (Postgres)**: Managed database with Prisma ORM
- **Secret Manager**: Secure credential storage

### LLM Providers
- **Anthropic Claude** (primary): claude-3-5-sonnet-20250129
- **OpenAI** (fallback): gpt-4-turbo, gpt-4o-mini

### Development Tools
- **TypeScript**: Type-safe AI agent development
- **Zod**: Schema validation for tool inputs
- **Pino**: Structured logging
- **Cloud Build**: CI/CD for container deployment

## Cloud Tasks vs BullMQ Decision

### Cloud Tasks (Recommended - GCP-Native)

**Pros:**
- No infrastructure to manage (fully managed)
- Native GCP integration (IAM, logging, monitoring)
- Automatic retries with exponential backoff
- Task scheduling (run now or delayed)
- Free tier: 1M tasks/month
- Direct HTTP invocation of Cloud Run
- **Best for learning GCP**

**Cons:**
- Less portable (GCP-specific)
- No built-in dashboard (use Cloud Console)
- Simpler feature set than BullMQ

### BullMQ + Memorystore Redis (Alternative - More Portable)

**Pros:**
- Rich features (priorities, rate limiting, job flows)
- Built-in UI dashboard (BullBoard)
- More portable (works on any cloud)
- Stronger job orchestration capabilities

**Cons:**
- Requires Memorystore Redis ($50+/month)
- More infrastructure to manage
- Worker must poll (vs Cloud Tasks push model)

**Decision**: Start with Cloud Tasks. Migrate to BullMQ later if needed.

## Database Schema

```prisma
// Add to prisma/schema.prisma

model AIJob {
  id           String   @id @default(cuid())
  userId       String
  type         String   // 'program_generator', 'workout_adapter', 'exercise_substitution'
  status       String   @default("queued") // queued, processing, completed, failed

  // Input parameters
  params       Json

  // Output results
  result       Json?
  error        String?

  // LLM metadata
  model        String?  // 'claude-3-5-sonnet-20250129', 'gpt-4-turbo'
  inputTokens  Int?
  outputTokens Int?
  cost         Float?

  // Timing
  createdAt    DateTime @default(now())
  startedAt    DateTime?
  completedAt  DateTime?
  duration     Int?     // milliseconds

  @@index([userId, status])
  @@index([status, createdAt])
  @@index([userId, type, createdAt])
}
```

## Project Structure

```
/apps
  /web                          # Next.js App (Control Plane)
    /app
      /api
        /ai
          /generate-program/route.ts   # Creates job
          /jobs/[id]/route.ts          # Check job status
    /lib
      /gcp
        /cloud-tasks.ts         # Cloud Tasks client
        /secrets.ts             # Secret Manager access

  /ai-worker                    # Standalone AI Worker Service
    /src
      /agents                   # LangGraph agent definitions
        /program-generator.ts
        /workout-adapter.ts
        /exercise-substitution.ts
      /tools                    # Type-safe tools for agents
        /workout-tools.ts
        /exercise-tools.ts
        /validation-tools.ts
      /handlers                 # HTTP handlers for Cloud Run
        /task-handler.ts        # Receives Cloud Tasks payloads
      /llm                      # LLM provider configs
        /providers.ts           # OpenAI, Anthropic, Gemini
        /fallbacks.ts           # Provider fallback logic
      /lib
        /logger.ts              # Pino structured logging
        /cost.ts                # LLM cost calculation
        /metrics.ts             # Custom metrics
      server.ts                 # Express server for Cloud Run
    Dockerfile
    cloudbuild.yaml             # Cloud Build config

/packages
  /shared                       # Shared between web and worker
    /prisma
    /types
    /schemas                    # Zod schemas

terraform/                      # Infrastructure as Code
  main.tf
  cloud-run.tf
  cloud-tasks.tf
  iam.tf
```

## GCP Resource Setup

### 1. Enable APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudtasks.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com
```

### 2. Create Cloud SQL Instance

```bash
gcloud sql instances create fitcsv-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup \
  --availability-type=zonal

gcloud sql databases create fitcsv \
  --instance=fitcsv-db

# Create user and get connection string
# Add to Secret Manager as DATABASE_URL
```

### 3. Create Secrets

```bash
# Store API keys in Secret Manager
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY \
  --data-file=- \
  --replication-policy=automatic

echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY \
  --data-file=- \
  --replication-policy=automatic

# Store database URL
echo -n "postgresql://..." | gcloud secrets create DATABASE_URL \
  --data-file=- \
  --replication-policy=automatic
```

### 4. Create Artifact Registry

```bash
gcloud artifacts repositories create fitcsv-ai \
  --repository-format=docker \
  --location=us-central1 \
  --description="FitCSV AI worker images"
```

### 5. Create Cloud Tasks Queue

```bash
gcloud tasks queues create ai-jobs \
  --location=us-central1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=50 \
  --max-attempts=3 \
  --min-backoff=30s \
  --max-backoff=3600s
```

## Implementation

### Step 1: Next.js API Route (Enqueue Job)

```typescript
// apps/web/app/api/ai/generate-program/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db';
import { createCloudTask } from '@/lib/gcp/cloud-tasks';
import { z } from 'zod';

const requestSchema = z.object({
  goal: z.enum(['strength', 'hypertrophy', 'powerlifting']),
  frequency: z.number().min(2).max(6),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  equipment: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getCurrentUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate input
    const body = await req.json();
    const params = requestSchema.parse(body);

    // Create job record
    const job = await prisma.aIJob.create({
      data: {
        userId: user.id,
        type: 'program_generator',
        status: 'queued',
        params,
      }
    });

    // Enqueue to Cloud Tasks
    await createCloudTask({
      queue: 'ai-jobs',
      taskName: `program-generator-${job.id}`,
      url: `${process.env.AI_WORKER_URL}/tasks/program-generator`,
      payload: {
        jobId: job.id,
        userId: user.id,
        params,
      },
      scheduleDelaySeconds: 0, // Run immediately
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'queued'
    });
  } catch (error) {
    console.error('Error creating AI job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 2: Cloud Tasks Client Library

```typescript
// apps/web/lib/gcp/cloud-tasks.ts
import { CloudTasksClient } from '@google-cloud/tasks';

const client = new CloudTasksClient();

interface CreateTaskOptions {
  queue: string;
  taskName: string;
  url: string;
  payload: any;
  scheduleDelaySeconds?: number;
}

export async function createCloudTask({
  queue,
  taskName,
  url,
  payload,
  scheduleDelaySeconds = 0,
}: CreateTaskOptions) {
  const project = process.env.GCP_PROJECT_ID!;
  const location = process.env.GCP_REGION || 'us-central1';

  const parent = client.queuePath(project, location, queue);

  const task = {
    name: `${parent}/tasks/${taskName}`,
    httpRequest: {
      httpMethod: 'POST' as const,
      url,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      oidcToken: {
        serviceAccountEmail: process.env.CLOUD_RUN_SERVICE_ACCOUNT!,
      },
    },
    scheduleTime: scheduleDelaySeconds > 0 ? {
      seconds: Date.now() / 1000 + scheduleDelaySeconds,
    } : undefined,
  };

  const [response] = await client.createTask({ parent, task });
  return response;
}
```

### Step 3: Cloud Run Worker Service

```typescript
// apps/ai-worker/src/server.ts
import express from 'express';
import { logger } from './lib/logger';
import { taskHandler } from './handlers/task-handler';

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-worker' });
});

// Task handler endpoint (called by Cloud Tasks)
app.post('/tasks/:taskType', async (req, res) => {
  const { taskType } = req.params;

  try {
    logger.info({ taskType, body: req.body }, 'Received task');

    const result = await taskHandler(taskType, req.body);

    res.json({ success: true, result });
  } catch (error) {
    logger.error({ error, taskType }, 'Task failed');

    // Return 500 to trigger Cloud Tasks retry
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'AI Worker started');
});
```

### Step 4: Task Handler with LangGraph

```typescript
// apps/ai-worker/src/handlers/task-handler.ts
import { prisma } from '@shared/prisma';
import { programGeneratorAgent } from '../agents/program-generator';
import { logger } from '../lib/logger';
import { calculateCost } from '../lib/cost';

export async function taskHandler(taskType: string, payload: any) {
  const { jobId, userId, params } = payload;

  // Update job status to processing
  await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date()
    }
  });

  const startTime = Date.now();

  try {
    let result;

    switch (taskType) {
      case 'program-generator':
        result = await programGeneratorAgent({ userId, params });
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }

    const duration = Date.now() - startTime;

    // Update job with results
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        result,
        completedAt: new Date(),
        duration,
        model: result.model,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        cost: calculateCost(result.model, result.usage),
      }
    });

    logger.info({ jobId, duration }, 'Job completed');

    return { success: true, programId: result.programId };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Update job with error
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
        duration,
      }
    });

    logger.error({ jobId, error, duration }, 'Job failed');

    throw error; // Cloud Tasks will retry
  }
}
```

### Step 5: LangGraph Agent

```typescript
// apps/ai-worker/src/agents/program-generator.ts
import { StateGraph, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { prisma } from '@shared/prisma';
import { logger } from '../lib/logger';

type ProgramState = {
  userId: string;
  params: {
    goal: string;
    frequency: number;
    experience: string;
    equipment: string[];
  };
  exercisePool: any[];
  weeks: any[];
  program: any | null;
  error?: string;
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
};

export async function programGeneratorAgent({ userId, params }) {
  const graph = createProgramGraph();

  const result = await graph.invoke({
    userId,
    params,
    exercisePool: [],
    weeks: [],
    program: null,
  });

  return result;
}

function createProgramGraph() {
  const graph = new StateGraph<ProgramState>({
    channels: {
      userId: null,
      params: null,
      exercisePool: { value: (x, y) => y || x, default: () => [] },
      weeks: { value: (x, y) => y || x, default: () => [] },
      program: { value: (x, y) => y || x, default: () => null },
      error: null,
      model: null,
      usage: null,
    }
  });

  // Node 1: Query exercise database
  graph.addNode('select_exercises', async (state) => {
    logger.info('Selecting exercises from database');

    const exercises = await prisma.exerciseDefinition.findMany({
      where: {
        OR: [
          { isSystem: true },
          { createdBy: state.userId }
        ],
        equipment: {
          hasSome: state.params.equipment
        }
      }
    });

    return { exercisePool: exercises };
  });

  // Node 2: Generate periodization with LLM
  graph.addNode('create_periodization', async (state) => {
    logger.info('Generating periodization with LLM');

    // Try Anthropic first
    try {
      const llm = new ChatAnthropic({
        model: 'claude-3-5-sonnet-20250129',
        temperature: 0.7,
      });

      const prompt = `You are a strength coach. Design a ${state.params.frequency}-day
per week program for a ${state.params.experience} lifter focused on ${state.params.goal}.

Available exercises: ${state.exercisePool.map(e => e.name).join(', ')}

Create 12 weeks with progressive overload. Return ONLY valid JSON (no markdown):
{
  "weeks": [
    {
      "weekNumber": 1,
      "workouts": [
        {
          "name": "Upper Power",
          "dayNumber": 1,
          "exercises": [
            {
              "exerciseDefinitionId": "${state.exercisePool[0]?.id}",
              "name": "${state.exercisePool[0]?.name}",
              "sets": [
                {"setNumber": 1, "reps": "5", "weight": "80%", "rpe": 8}
              ]
            }
          ]
        }
      ]
    }
  ]
}`;

      const response = await llm.invoke(prompt);
      const content = response.content.toString();

      // Strip markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const data = JSON.parse(jsonStr);

      return {
        weeks: data.weeks,
        model: 'claude-3-5-sonnet-20250129',
        usage: {
          inputTokens: response.response_metadata?.usage?.input_tokens || 0,
          outputTokens: response.response_metadata?.usage?.output_tokens || 0,
        }
      };
    } catch (error) {
      logger.warn('Anthropic failed, falling back to OpenAI');

      // Fallback to OpenAI
      const llm = new ChatOpenAI({
        model: 'gpt-4-turbo',
        temperature: 0.7,
      });

      // Same prompt...
      const response = await llm.invoke(prompt);
      const data = JSON.parse(response.content.toString());

      return {
        weeks: data.weeks,
        model: 'gpt-4-turbo',
        usage: {
          inputTokens: response.response_metadata?.usage?.prompt_tokens || 0,
          outputTokens: response.response_metadata?.usage?.completion_tokens || 0,
        }
      };
    }
  });

  // Node 3: Validate program
  graph.addNode('validate_program', async (state) => {
    logger.info('Validating program structure');

    // Basic validation
    if (!state.weeks || state.weeks.length !== 12) {
      return { error: 'Must have exactly 12 weeks' };
    }

    for (const week of state.weeks) {
      if (week.workouts.length !== state.params.frequency) {
        return { error: `Week ${week.weekNumber} has wrong workout count` };
      }
    }

    return { program: { weeks: state.weeks } };
  });

  // Node 4: Save to database
  graph.addNode('save_to_database', async (state) => {
    logger.info('Saving program to database');

    const program = await prisma.program.create({
      data: {
        name: `${state.params.goal} Program`,
        description: `AI-generated ${state.params.frequency}x/week program`,
        programType: state.params.goal,
        userId: state.userId,
        isUserCreated: true,
        weeks: {
          create: state.weeks.map(week => ({
            weekNumber: week.weekNumber,
            userId: state.userId,
            workouts: {
              create: week.workouts.map(workout => ({
                name: workout.name,
                dayNumber: workout.dayNumber,
                userId: state.userId,
                exercises: {
                  create: workout.exercises.map((ex, idx) => ({
                    name: ex.name,
                    exerciseDefinitionId: ex.exerciseDefinitionId,
                    order: idx,
                    userId: state.userId,
                    prescribedSets: {
                      create: ex.sets.map(set => ({
                        setNumber: set.setNumber,
                        reps: set.reps.toString(),
                        weight: set.weight,
                        rpe: set.rpe,
                        userId: state.userId,
                      }))
                    }
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: {
                  include: {
                    prescribedSets: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return {
      program: {
        ...state.program,
        programId: program.id
      }
    };
  });

  // Define graph flow
  graph.setEntryPoint('select_exercises');
  graph.addEdge('select_exercises', 'create_periodization');
  graph.addEdge('create_periodization', 'validate_program');

  graph.addConditionalEdges(
    'validate_program',
    (state) => state.error ? 'create_periodization' : 'save_to_database',
    {
      create_periodization: 'create_periodization',
      save_to_database: 'save_to_database'
    }
  );

  graph.addEdge('save_to_database', END);

  return graph.compile();
}
```

### Step 6: Dockerfile

```dockerfile
# apps/ai-worker/Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci

# Generate Prisma client
FROM deps AS prisma
WORKDIR /app
COPY packages/shared/prisma ./packages/shared/prisma
RUN npx prisma generate --schema=./packages/shared/prisma/schema.prisma

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Cloud Run runs as non-root
USER node

EXPOSE 8080

CMD ["node", "dist/server.js"]
```

### Step 7: Cloud Build CI/CD

```yaml
# apps/ai-worker/cloudbuild.yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:$COMMIT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:latest'
      - '.'

  # Push to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:$COMMIT_SHA'

  # Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'ai-worker'
      - '--image'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--timeout'
      - '3600'
      - '--max-instances'
      - '10'
      - '--min-instances'
      - '0'
      - '--set-secrets'
      - 'DATABASE_URL=DATABASE_URL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/fitcsv-ai/ai-worker:latest'
```

## Deployment Commands

### Local Development

```bash
# Run AI worker locally
cd apps/ai-worker
doppler run -- npm run dev

# Test with ngrok for Cloud Tasks webhook
ngrok http 8080

# Create test task pointing to ngrok URL
```

### Deploy to GCP

```bash
# Build and deploy via Cloud Build
gcloud builds submit \
  --config=apps/ai-worker/cloudbuild.yaml \
  apps/ai-worker/

# Or deploy directly
cd apps/ai-worker
gcloud run deploy ai-worker \
  --source . \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest
```

## Cost Estimates

### GCP Services (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Cloud Run | 1M requests, 360K GB-sec | $0 (free tier) |
| Cloud Tasks | 1M operations | $0 (free tier) |
| Cloud SQL (db-f1-micro) | Shared-core, 0.6GB RAM | ~$7 |
| Secret Manager | 6 secrets, 10K accesses | $0.36 |
| Artifact Registry | <500 GB | $0 (free tier) |
| Cloud Logging | 50 GB | $0 (free tier) |
| **Total** | | **~$7.50/month** |

### LLM Costs (Per Program Generation)

| Model | Tokens | Cost |
|-------|--------|------|
| Claude 3.5 Sonnet | 5K input, 15K output | ~$0.45 |
| GPT-4 Turbo (fallback) | 5K input, 15K output | ~$0.20 |

**Estimated**: $0.20-0.45 per program generation

## Monitoring & Observability

### Cloud Logging

```typescript
// apps/ai-worker/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Cloud Logging expects JSON
  formatters: {
    level: (label) => {
      return { severity: label.toUpperCase() };
    },
  },
});
```

### Custom Metrics

```typescript
// apps/ai-worker/src/lib/metrics.ts
import { Logging } from '@google-cloud/logging';

const logging = new Logging();
const log = logging.log('ai-worker-metrics');

export async function recordMetric(metric: {
  name: string;
  value: number;
  labels?: Record<string, string>;
}) {
  const metadata = {
    resource: { type: 'cloud_run_revision' },
    severity: 'INFO',
  };

  const entry = log.entry(metadata, {
    metric: metric.name,
    value: metric.value,
    ...metric.labels,
  });

  await log.write(entry);
}

// Usage in code
await recordMetric({
  name: 'job_duration_ms',
  value: duration,
  labels: { jobType: 'program_generator', status: 'success' }
});
```

### Alerts

```bash
# Create alert policy for job failures
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="AI Job Failures" \
  --condition-display-name="High Error Rate" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="logging.googleapis.com/user/job_failures"'
```

## Security Best Practices

### IAM Permissions

```bash
# Grant Cloud Tasks permission to invoke Cloud Run
gcloud run services add-iam-policy-binding ai-worker \
  --region=us-central1 \
  --member=serviceAccount:cloud-tasks-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.invoker

# Grant Cloud Run permission to access secrets
gcloud secrets add-iam-policy-binding OPENAI_API_KEY \
  --member=serviceAccount:cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### VPC Connector (Optional - Enhanced Security)

```bash
# Create VPC connector for Cloud Run → Cloud SQL private IP
gcloud compute networks vpc-access connectors create fitcsv-vpc \
  --region=us-central1 \
  --subnet=default \
  --subnet-project=${PROJECT_ID} \
  --min-instances=2 \
  --max-instances=3

# Deploy Cloud Run with VPC connector
gcloud run deploy ai-worker \
  --vpc-connector=fitcsv-vpc \
  --vpc-egress=private-ranges-only
```

## Incremental Implementation Plan

### Phase 1: Minimal Setup (Week 1)
- [ ] Create GCP project and enable APIs
- [ ] Set up Cloud SQL and Secret Manager
- [ ] Create simple Cloud Run service (hello world)
- [ ] Test Cloud Tasks → Cloud Run invocation
- [ ] Add Prisma and database migration

### Phase 2: Basic AI Agent (Week 2)
- [ ] Implement simple LangGraph agent (2 nodes)
- [ ] Add one tool: "Suggest exercise substitution"
- [ ] Deploy to Cloud Run
- [ ] Create Next.js API route to enqueue task
- [ ] Test end-to-end flow

### Phase 3: Program Generator (Week 3-4)
- [ ] Build full program generation LangGraph (4-5 nodes)
- [ ] Add LLM provider fallback logic
- [ ] Implement cost tracking
- [ ] Add structured logging
- [ ] Deploy with Cloud Build CI/CD

### Phase 4: Production Features (Week 5-6)
- [ ] Set up Cloud Monitoring dashboards
- [ ] Create alert policies
- [ ] Add job priority support in Cloud Tasks
- [ ] Implement rate limiting per user
- [ ] Add job status polling UI
- [ ] Load testing and optimization

## Learning Resources

### GCP-Specific
- [Host AI Agents on Cloud Run](https://docs.cloud.google.com/run/docs/ai-agents) (Official docs)
- [Deploy ADK Agents on Cloud Run](https://thenewstack.io/a-step-by-step-guide-to-deploying-adk-agents-on-cloud-run/)
- [Cloud Tasks Quickstart](https://cloud.google.com/tasks/docs/quickstart)

### LangGraph
- [LangGraph on Cloud Run Tutorial](https://medium.com/@chirazchahbeni/deploying-streaming-ai-agents-with-langgraph-fastapi-and-google-cloud-run-5e32232ef1fb)
- [Building Multi-Agent Systems with LangGraph on GCP](https://codelabs.developers.google.com/aidemy-multi-agent/instructions)

### Architecture Patterns
- [Choosing Cloud Tasks vs Pub/Sub](https://cloud.google.com/pubsub/docs/choosing-pubsub-or-cloud-tasks)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)

## Next Steps

1. Start with Phase 1 to get comfortable with GCP services
2. Build muscle memory with Cloud Tasks and Cloud Run
3. Learn LangGraph incrementally (don't build complex graphs initially)
4. Monitor costs closely in Cloud Console
5. Iterate based on real usage patterns

---

**Last Updated**: 2026-01-22
