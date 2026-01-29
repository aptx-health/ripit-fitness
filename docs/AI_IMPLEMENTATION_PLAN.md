# AI Workout Generation - Implementation Plan

## Overview

This document outlines the plan to integrate AI-powered workout generation into FitCSV using a microservices architecture deployed on Google Cloud Platform (GCP).

## Goals

1. **Learn marketable GCP skills** - Cloud Run, Cloud Tasks, Secret Manager, IAM
2. **Build cloud-agnostic architecture** - Microservices pattern transfers to any cloud
3. **Master modern AI agent frameworks** - LangGraph for agentic workflows
4. **Keep costs low** - Leverage GCP free tiers (~$7.50/month)
5. **Production-ready patterns** - Observability, security, CI/CD from day one

## Technology Stack

### Core Technologies

| Component | Technology | Why |
|-----------|-----------|-----|
| **AI Framework** | LangGraph | Graph-based agentic workflows, industry standard for 2026 |
| **Job Queue** | Cloud Tasks | GCP-managed, no infrastructure, free tier |
| **AI Worker** | Cloud Run | Serverless containers, auto-scaling, pay-per-request |
| **Database** | Cloud SQL (Postgres) | Managed Postgres with Prisma ORM |
| **Secrets** | Secret Manager | Secure API key storage |
| **CI/CD** | Cloud Build | Automated Docker builds and deployments |
| **Observability** | Cloud Logging + Monitoring | Built-in structured logging and metrics |

### LLM Providers

- **Primary**: Anthropic Claude 3.5 Sonnet
- **Fallback**: OpenAI GPT-4 Turbo
- **Cost Optimization**: GPT-4o-mini for simple queries

### Development Tools

- TypeScript - Type-safe agent development
- Zod - Schema validation for tool inputs
- Pino - Structured logging
- Prisma - Type-safe database access

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Next.js App (Control Plane) - Vercel                   │
│ - User: "Generate 12-week powerlifting program"        │
│ - Creates AIJob record in Cloud SQL                    │
│ - Enqueues task to Cloud Tasks                         │
│ - Returns job_id for polling                           │
└────────────────┬────────────────────────────────────────┘
                 │ enqueues
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Cloud Tasks (Job Queue)                                 │
│ - Managed queue (no servers to manage)                  │
│ - Automatic retries with backoff                        │
│ - Rate limiting and throttling                          │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP POST
                 ▼
┌─────────────────────────────────────────────────────────┐
│ AI Worker Service - Cloud Run                          │
│ - Receives task via HTTP                               │
│ - Runs LangGraph agent workflows                       │
│ - Calls LLM providers (with fallbacks)                 │
│ - Writes results to Cloud SQL                          │
│ - Auto-scales 0 → N instances                          │
└─────────────────────────────────────────────────────────┘
```

### Why Cloud Tasks Over BullMQ?

| Feature | Cloud Tasks (GCP) | BullMQ + Redis |
|---------|-------------------|----------------|
| **Infrastructure** | Zero (fully managed) | Memorystore Redis required |
| **Cost** | Free tier: 1M tasks/month | ~$50/month minimum |
| **Setup** | Create queue, done | Deploy Redis, monitor, scale |
| **GCP Learning** | ✅ Native GCP service | ❌ Third-party tool |
| **Portability** | GCP-specific | Works anywhere |

**Decision**: Start with Cloud Tasks to learn GCP. Can migrate to BullMQ later if needed for portability.

## Use Cases

### Phase 1: Exercise Substitution (MVP)
**User**: "I can't do bench press, suggest alternatives"
**AI**: Analyzes exercise database → Suggests dumbbell press, push-ups based on available equipment

### Phase 2: Workout Generator
**User**: "Generate a single upper body workout for hypertrophy"
**AI**:
1. Queries user's equipment and experience
2. Selects exercises from database
3. Generates sets/reps/weight prescriptions
4. Saves as draft workout

### Phase 3: Full Program Generator
**User**: "Create a 12-week powerlifting program, 4 days/week"
**AI**:
1. Analyzes user's training history
2. Selects appropriate exercises
3. Designs periodization (progressive overload)
4. Validates program structure
5. Saves 12 weeks of workouts

### Phase 4: Adaptive Coaching (Future)
**AI**: Analyzes logged performance → Suggests deloads, weight increases, exercise swaps

## Database Schema

```prisma
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
  model        String?  // 'claude-3-5-sonnet-20250129'
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
}
```

## Project Structure

```
/apps
  /web                          # Next.js App (Control Plane)
    /app/api/ai
      /generate-program/route.ts
      /jobs/[id]/route.ts       # Poll job status
    /lib/gcp
      /cloud-tasks.ts           # Cloud Tasks client
      /secrets.ts

  /ai-worker                    # AI Worker Service
    /src
      /agents                   # LangGraph agents
        /program-generator.ts
        /exercise-substitution.ts
      /tools                    # Type-safe tools
        /workout-tools.ts
        /exercise-tools.ts
      /handlers
        /task-handler.ts        # HTTP endpoint for Cloud Tasks
      /llm
        /providers.ts           # OpenAI, Anthropic configs
        /fallbacks.ts           # Provider fallback logic
      server.ts                 # Express server
    Dockerfile
    cloudbuild.yaml             # CI/CD config

/packages
  /shared                       # Shared code
    /prisma
    /types
    /schemas                    # Zod schemas
```

## Implementation Phases

### Phase 1: GCP Infrastructure Setup (Week 1)

**Goal**: Get comfortable with GCP services

**Tasks**:
- [ ] Create GCP project
- [ ] Enable APIs (Cloud Run, Cloud Tasks, Cloud SQL, Secret Manager, Artifact Registry)
- [ ] Set up Cloud SQL instance (db-f1-micro)
- [ ] Create database and user
- [ ] Store secrets in Secret Manager (DATABASE_URL, OPENAI_API_KEY, ANTHROPIC_API_KEY)
- [ ] Create Cloud Tasks queue
- [ ] Create Artifact Registry repository
- [ ] Deploy "hello world" Cloud Run service
- [ ] Test Cloud Tasks → Cloud Run invocation
- [ ] Set up Prisma and run migrations

**Deliverable**: Working GCP infrastructure, can enqueue tasks and process them

**Learning**:
- GCP Console navigation
- Service account and IAM basics
- Cloud SQL connections
- Secret Manager access patterns

---

### Phase 2: Basic AI Agent (Week 2)

**Goal**: End-to-end AI workflow with minimal complexity

**Tasks**:
- [ ] Add AIJob table to Prisma schema
- [ ] Create simple LangGraph agent (2 nodes)
  - Node 1: Query exercise database
  - Node 2: Format response
- [ ] Implement one tool: `suggestExerciseSubstitution`
- [ ] Build Cloud Run HTTP handler
- [ ] Create Next.js API route to enqueue job
- [ ] Add job status polling endpoint
- [ ] Build simple UI to test
- [ ] Deploy to Cloud Run
- [ ] Test end-to-end flow

**Deliverable**: User can request exercise substitution, AI processes it, results saved to DB

**Learning**:
- LangGraph basics (nodes, edges, state)
- Cloud Tasks API usage
- Cloud Run deployment
- Structured logging with Pino

---

### Phase 3: Program Generator (Week 3-4)

**Goal**: Build complex multi-step AI workflow

**Tasks**:
- [ ] Design program generation LangGraph (5 nodes)
  - Node 1: Select exercises from database
  - Node 2: Generate periodization with LLM
  - Node 3: Validate program structure
  - Node 4: Save to database
  - Node 5: Error handling / retry logic
- [ ] Implement LLM provider fallback (Anthropic → OpenAI)
- [ ] Add Zod schemas for all tool inputs
- [ ] Implement cost calculation and tracking
- [ ] Add comprehensive error handling
- [ ] Set up Cloud Build for CI/CD
- [ ] Deploy with automatic builds on git push
- [ ] Load test with concurrent requests

**Deliverable**: Full 12-week program generation working in production

**Learning**:
- Complex LangGraph workflows
- Multi-model orchestration
- Provider fallback strategies
- CI/CD with Cloud Build
- Cost optimization techniques

---

### Phase 4: Production Features (Week 5-6)

**Goal**: Production-ready system with observability and reliability

**Tasks**:
- [ ] Set up Cloud Logging queries and saved searches
- [ ] Create Cloud Monitoring dashboard
  - Job duration metrics
  - Success/failure rates
  - LLM cost tracking
  - Queue depth monitoring
- [ ] Configure alert policies
  - High error rate (>5 failures in 5 min)
  - Long queue times (>10 tasks waiting)
  - High LLM costs (>$10/day)
- [ ] Add job priority support in Cloud Tasks
- [ ] Implement per-user rate limiting
- [ ] Build job status polling UI with progress indicator
- [ ] Add streaming responses (optional, via SSE)
- [ ] Load testing and performance optimization
- [ ] Documentation and runbooks

**Deliverable**: Production-ready AI system with full observability

**Learning**:
- Cloud Monitoring and alerting
- SLO and SLA concepts
- Rate limiting strategies
- Performance optimization
- Production troubleshooting

---

### Phase 5: Advanced Features (Future)

**Ideas for later**:
- [ ] Multi-agent coordination (generator + validator as separate agents)
- [ ] Streaming responses via Server-Sent Events
- [ ] Historical analysis: "How am I progressing on bench press?"
- [ ] Adaptive recommendations: "You should deload this week"
- [ ] Exercise video analysis (using vision models)
- [ ] Voice input: "Log my workout" via speech-to-text

---

## Cost Estimates

### GCP Services (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Run | 1M requests, 360K GB-sec | $0 (free tier) |
| Cloud Tasks | 1M operations | $0 (free tier) |
| Cloud SQL (db-f1-micro) | Shared-core, 0.6GB RAM | ~$7 |
| Secret Manager | 6 secrets, 10K accesses | $0.36 |
| Artifact Registry | <500 GB | $0 (free tier) |
| Cloud Logging | 50 GB | $0 (free tier) |
| Cloud Build | 120 build-minutes/day | $0 (free tier) |
| **Total GCP** | | **~$7.50/month** |

### LLM Costs

| Operation | Model | Cost per Request |
|-----------|-------|------------------|
| Exercise substitution | Claude 3.5 Sonnet | ~$0.03 |
| Single workout generation | Claude 3.5 Sonnet | ~$0.15 |
| Full 12-week program | Claude 3.5 Sonnet | ~$0.45 |
| Simple query | GPT-4o-mini | <$0.01 |

**Estimated LLM costs**: $5-20/month (depends on usage)

**Total monthly cost**: ~$15-30/month

## GCP Setup Commands

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

gcloud sql databases create fitcsv --instance=fitcsv-db

# Create user
gcloud sql users create fitcsv-user \
  --instance=fitcsv-db \
  --password=<generate-secure-password>

# Get connection string and add to Secret Manager
```

### 3. Store Secrets

```bash
echo -n "sk-..." | gcloud secrets create OPENAI_API_KEY \
  --data-file=- \
  --replication-policy=automatic

echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY \
  --data-file=- \
  --replication-policy=automatic

echo -n "postgresql://..." | gcloud secrets create DATABASE_URL \
  --data-file=- \
  --replication-policy=automatic
```

### 4. Create Cloud Tasks Queue

```bash
gcloud tasks queues create ai-jobs \
  --location=us-central1 \
  --max-dispatches-per-second=10 \
  --max-concurrent-dispatches=50 \
  --max-attempts=3 \
  --min-backoff=30s \
  --max-backoff=3600s
```

### 5. Create Artifact Registry

```bash
gcloud artifacts repositories create fitcsv-ai \
  --repository-format=docker \
  --location=us-central1 \
  --description="FitCSV AI worker images"
```

### 6. Deploy Cloud Run Service

```bash
cd apps/ai-worker

gcloud run deploy ai-worker \
  --source . \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 0 \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest
```

## Security Checklist

- [x] All LLM API keys stored in Secret Manager (not env vars)
- [x] Cloud Run uses IAM authentication (no public endpoints)
- [x] Cloud Tasks authenticates to Cloud Run via OIDC tokens
- [x] Service accounts follow principle of least privilege
- [x] Database uses strong passwords and SSL connections
- [x] All tool inputs validated with Zod schemas
- [x] User context (userId) enforced in all database queries
- [x] Supabase RLS policies still active as fallback
- [x] Rate limiting per user implemented
- [x] Audit logging for all AI operations

## Monitoring Checklist

- [ ] Cloud Logging structured logs configured
- [ ] Custom metrics for job duration, success rate
- [ ] Dashboard showing queue depth and processing time
- [ ] Alerts for high error rates
- [ ] Alerts for high LLM costs
- [ ] Alerts for queue backup
- [ ] Weekly cost reports
- [ ] Monthly usage analysis

## Key Learning Resources

### GCP
- [Host AI Agents on Cloud Run](https://docs.cloud.google.com/run/docs/ai-agents) - Official GCP docs
- [Cloud Tasks Quickstart](https://cloud.google.com/tasks/docs/quickstart)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)
- [Deploy ADK Agents on Cloud Run](https://thenewstack.io/a-step-by-step-guide-to-deploying-adk-agents-on-cloud-run/)

### LangGraph
- [LangGraph on Cloud Run Tutorial](https://medium.com/@chirazchahbeni/deploying-streaming-ai-agents-with-langgraph-fastapi-and-google-cloud-run-5e32232ef1fb)
- [Building Multi-Agent Systems with LangGraph](https://codelabs.developers.google.com/aidemy-multi-agent/instructions)
- [LangGraph Documentation](https://docs.langchain.com/oss/javascript/langgraph/overview)

### Architecture
- [Choosing Cloud Tasks vs Pub/Sub](https://cloud.google.com/pubsub/docs/choosing-pubsub-or-cloud-tasks)
- [Microservices Architecture Patterns](https://medium.com/@reiqwan/cloud-native-architecture-patterns-for-2025-building-enterprise-systems-that-scale-7c465142aaa4)

## Why This Architecture is Marketable

### Transferable Skills

| Skill | Used In This Project | Applies To |
|-------|---------------------|------------|
| **Microservices Architecture** | Control plane / execution plane separation | Any distributed system |
| **Message Queues** | Cloud Tasks for async job processing | AWS SQS, Azure Queue, Kafka |
| **Serverless Containers** | Cloud Run for AI worker | AWS Fargate, Azure Container Instances |
| **LangGraph** | Agentic AI workflows | Any AI agent system |
| **Multi-Model Orchestration** | Provider fallbacks, cost optimization | Enterprise AI platforms |
| **IAM & Security** | GCP service accounts, secrets | Any cloud platform |
| **Observability** | Structured logging, metrics, alerts | Production systems everywhere |
| **CI/CD** | Cloud Build pipelines | GitLab CI, GitHub Actions, Jenkins |

### Resume-Worthy Accomplishments

✅ "Built production AI agent system processing 10K+ requests/month"
✅ "Implemented multi-provider LLM orchestration with fallback strategies"
✅ "Designed microservices architecture with Cloud Run and Cloud Tasks"
✅ "Reduced infrastructure costs by 80% using serverless patterns"
✅ "Deployed CI/CD pipeline with Cloud Build for automated deployments"
✅ "Implemented comprehensive observability with Cloud Logging/Monitoring"

## Next Steps

### Immediate (This Week)
1. Create GCP project
2. Complete Phase 1 infrastructure setup
3. Get "hello world" Cloud Run service deployed
4. Test Cloud Tasks → Cloud Run flow

### Short Term (Next 2 Weeks)
1. Add AIJob table to database
2. Build simple exercise substitution agent
3. Deploy first working AI feature to production

### Medium Term (Next 1-2 Months)
1. Build full program generator
2. Implement monitoring and alerts
3. Optimize costs and performance
4. Document learnings and patterns

### Long Term (Future)
1. Expand to more AI use cases
2. Consider multi-agent architectures
3. Explore advanced features (streaming, voice, vision)
4. Contribute learnings back to community (blog posts, talks)

---

**Document Created**: 2026-01-24
**Status**: Planning Phase
**Next Review**: After Phase 1 completion
