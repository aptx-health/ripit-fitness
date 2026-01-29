# Local Development with Pub/Sub Emulator

How to run the complete program cloning flow locally for testing without deploying to GCP.

## Architecture

```
Next.js (localhost:3000)
  └─> Pub/Sub Emulator (localhost:8681)
      └─> Clone Worker (localhost:8082)
          └─> Local PostgreSQL (localhost:5432/fitcsv_local)
```

Everything stays local - no GCP resources are used.

## Prerequisites

1. **Docker** - For running Pub/Sub emulator
2. **PostgreSQL** - Local instance running on port 5432
3. **Doppler dev_personal config** - Configured with local database

## Setup

### 1. Configure Doppler dev_personal

```bash
# Point to local database
doppler secrets set DATABASE_URL="postgresql://dustin@localhost:5432/fitcsv_local" --config dev_personal
doppler secrets set DIRECT_URL="postgresql://dustin@localhost:5432/fitcsv_local" --config dev_personal

# Set emulator host (worker and app will detect this)
doppler secrets set PUBSUB_EMULATOR_HOST="localhost:8681" --config dev_personal

# Copy GCP credentials (for when you want to test against production Pub/Sub)
doppler secrets get GCP_PROJECT_ID --config dev --plain | \
  doppler secrets set GCP_PROJECT_ID --config dev_personal

doppler secrets get GCP_SERVICE_ACCOUNT_KEY --config dev --plain | \
  doppler secrets set GCP_SERVICE_ACCOUNT_KEY --config dev_personal
```

### 2. Create Local Database

```bash
# Create database
createdb fitcsv_local

# Push schema
doppler run --config dev_personal -- npx prisma db push

# Seed exercise definitions
psql -h localhost -U dustin -d fitcsv_local -f prisma/exercise-library-seed.sql

# Seed community programs (pick one)
psql -h localhost -U dustin -d fitcsv_local -f docs/seeds/minimal_community_test.sql
```

## Running Locally

### Option 1: Overmind (Recommended - Single Command)

**Install Overmind:**
```bash
brew install overmind tmux
```

**Start everything:**
```bash
overmind start
```

This starts all 3 services in tmux. You'll see:
- `emulator` - Pub/Sub emulator on port 8681
- `worker` - Clone worker on port 8082
- `app` - Next.js on port 3000

**Control individual processes:**
```bash
overmind restart worker    # Restart just the worker
overmind connect app       # Attach to Next.js logs (Ctrl+B then D to detach)
overmind stop              # Stop everything gracefully
```

**Force cleanup if needed:**
```bash
./scripts/stop-local-dev.sh
```

---

### Option 2: Manual (3 Terminals)

You need **3 terminals** running simultaneously:

### Terminal 1: Pub/Sub Emulator

```bash
docker run -p 8681:8681 messagebird/gcloud-pubsub-emulator:latest
```

Wait for: `Server started, listening on 8681`

### Terminal 2: Clone Worker

```bash
cd cloud-functions/clone-program
PORT=8082 doppler run --config dev_personal -- npm run dev
```

You should see:
```
Clone worker listening on port 8082
🔧 Local dev mode detected - subscribing to Pub/Sub emulator
✅ Subscribed to program-clone-jobs-sub on emulator
```

### Terminal 3: Next.js App

```bash
# From project root
doppler run --config dev_personal -- npm run dev
```

Visit: http://localhost:3000

## Testing the Flow

1. **Navigate to Community Programs** - http://localhost:3000/community
2. **Clone a program** - Click "Add to My Programs"
3. **Watch the terminals:**
   - **App**: `Published clone job for program {id}: messageId=...`
   - **Worker**: `📨 Received message from emulator: programId=...`
   - **Worker**: `✅ Clone job completed: programId=...`
4. **Check your programs** - http://localhost:3000/programs

The program will show progressive loading:
- `copyStatus: 'cloning_week_1_of_9'`
- `copyStatus: 'cloning_week_2_of_9'`
- ...
- `copyStatus: 'ready'`

## Troubleshooting

### Worker not receiving messages

Check that:
1. Pub/Sub emulator is running on port 8681
2. `PUBSUB_EMULATOR_HOST=localhost:8681` is set in dev_personal
3. Worker shows: "✅ Subscribed to program-clone-jobs-sub on emulator"

### Topic not found errors

The worker auto-creates the subscription on startup. If you see topic errors:

```bash
# Manually create topic and subscription
curl -X PUT http://localhost:8681/v1/projects/test-project/topics/program-clone-jobs

curl -X PUT http://localhost:8681/v1/projects/test-project/subscriptions/program-clone-jobs-sub \
  -H "Content-Type: application/json" \
  -d '{"topic": "projects/test-project/topics/program-clone-jobs"}'
```

### Port conflicts

- **8080 in use?** Change worker port: `PORT=8082 doppler run ...`
- **8681 in use?** Change emulator: `docker run -p 8682:8681 ...` and update `PUBSUB_EMULATOR_HOST`

### Database connection errors

Verify local PostgreSQL is running:
```bash
psql -h localhost -U dustin -d fitcsv_local -c "SELECT 1;"
```

## How It Works

### Production (Cloud Run)

In production, the flow uses Eventarc to deliver Pub/Sub messages via HTTP POST:

```
Next.js → Pub/Sub → Eventarc → HTTP POST to Cloud Run worker
```

The worker's HTTP endpoint (`app.post('/')`) handles these requests.

### Local Dev (Emulator)

The emulator doesn't have Eventarc, so the worker subscribes directly:

```
Next.js → Pub/Sub Emulator → Worker pulls messages via subscription
```

The worker detects `PUBSUB_EMULATOR_HOST` and starts a local subscriber in addition to the HTTP server. This subscriber listens for messages and processes them exactly like the production HTTP handler would.

See `cloud-functions/clone-program/src/index.ts` - the `startLocalSubscriber()` function handles emulator mode.

## Switching Between Local and Production

**Test against local database + emulator:**
```bash
# dev_personal config with PUBSUB_EMULATOR_HOST set
doppler run --config dev_personal -- npm run dev
```

**Test against Supabase + production Pub/Sub:**
```bash
# Remove emulator host to use real GCP Pub/Sub
doppler secrets delete PUBSUB_EMULATOR_HOST --config dev_personal

# Run with dev config (points to Supabase)
doppler run --config dev -- npm run dev
```

This lets you test the full production flow (Next.js → GCP Pub/Sub → Cloud Run worker) while running Next.js locally.
