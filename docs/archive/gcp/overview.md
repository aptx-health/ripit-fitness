# GCP Pub/Sub + Cloud Run — Overview

**Issue**: [#111](https://github.com/aptx-health/ripit-fitness/issues/111) — Implement GCP Pub/Sub for background program cloning

## Why We Need This

**Problem**: Large community programs (9+ weeks) fail to clone in production because Vercel kills the background process after the API response is sent.

**Solution**: Offload cloning to GCP Cloud Run, triggered by Pub/Sub messages.

## Architecture

```
┌─────────────────────┐
│  Next.js API        │
│  (Vercel)           │
│                     │
│  POST /api/clone    │
└──────────┬──────────┘
           │
           │ 1. Create shell program (copyStatus: 'cloning')
           │ 2. Publish message to Pub/Sub
           │ 3. Return programId immediately
           │
           ▼
┌─────────────────────┐
│  GCP Pub/Sub Topic  │
│  program-clone-jobs │
└──────────┬──────────┘
           │
           │ Eventarc trigger
           │
           ▼
┌─────────────────────┐
│  Cloud Run Function │
│  clone-program      │
│                     │
│  1. Decode message  │
│  2. Clone weeks     │
│  3. Update status   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Database  │
│  (PostgreSQL)       │
└─────────────────────┘
```

## GCP Project

- **Project ID**: `ripit-fitness`
- **Project Number**: 334725085515
- **Region**: `us-central1`
- **Tutorial deployment**: `https://hello-pubsub-334725085515.us-central1.run.app`

## Service Accounts

| Account | Purpose | Roles |
|---------|---------|-------|
| `eventarc-trigger-sa` | Eventarc invokes Cloud Run | `run.invoker`, `eventarc.eventReceiver` |
| `vercel-pubsub-publisher` | Next.js publishes to Pub/Sub | `pubsub.publisher` (future) |

## Cost

**Free tier includes:**
- Pub/Sub: 10GB messages/month
- Cloud Run: 2M requests/month, 360,000 GB-seconds
- Likely $0/month for this use case

## Related Docs

- [tutorial-walkthrough.md](tutorial-walkthrough.md) — What we did following the GCP tutorial
- [clone-worker-design.md](clone-worker-design.md) — Implementation plan for the actual clone worker
- [pubsub-testing.md](pubsub-testing.md) — Local emulator test infrastructure
