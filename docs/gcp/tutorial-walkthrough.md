# GCP Tutorial Walkthrough

Following the [GCP Event-Driven Cloud Run tutorial](https://docs.cloud.google.com/run/docs/tutorials/pubsub-eventdriven) to learn the platform before building the real clone worker.

**Date completed**: 2026-01-27

## What We Built

A hello-world Cloud Run function that receives Pub/Sub messages via Eventarc and logs them.

## Commands (in order)

```bash
# 1. Create project
gcloud projects create ripit-fitness --name="Ripit Fitness"
gcloud config set project ripit-fitness

# 2. Enable billing via console: https://console.cloud.google.com/billing

# 3. Enable APIs
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  eventarc.googleapis.com \
  run.googleapis.com \
  logging.googleapis.com \
  pubsub.googleapis.com

# 4. Set defaults
gcloud config set run/region us-central1
gcloud config set run/platform managed
gcloud config set eventarc/location us-central1

# 5. Shell variables
PROJECT_ID=ripit-fitness
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SERVICE_ACCOUNT=eventarc-trigger-sa

# 6. Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT

# 7. Grant IAM permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/eventarc.eventReceiver"

# 8. Deploy hello-pubsub function (see code below)
gcloud run deploy hello-pubsub --source . --allow-unauthenticated
# Result: https://hello-pubsub-334725085515.us-central1.run.app

# 9. Create topic
gcloud pubsub topics create init-test

# 10. Create Eventarc trigger
gcloud eventarc triggers create hello-trigger \
  --location=us-central1 \
  --destination-run-service=hello-pubsub \
  --destination-run-region=us-central1 \
  --event-filters="type=google.cloud.pubsub.topic.v1.messagePublished" \
  --transport-topic=projects/$PROJECT_ID/topics/init-test \
  --service-account=$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com

# 11. Test
gcloud pubsub topics publish init-test --message="Hello from GCP!"
gcloud run logs read hello-pubsub --limit=20
# ✅ SUCCESS
```

## Hello-World Code

**index.js**:
```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/', (req, res) => {
  const message = req.body.message;
  if (!message) {
    res.status(400).send('Bad Request: missing message');
    return;
  }
  const data = Buffer.from(message.data, 'base64').toString();
  console.log(`Received message: ${data}`);
  res.status(200).send('OK');
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on port ${port}`));
```

**package.json**:
```json
{
  "name": "hello-pubsub",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": { "express": "^4.18.2" }
}
```

**Dockerfile**:
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
CMD ["npm", "start"]
```

## What We Learned

**Cloud Run**: Serverless containers. Auto-scales to zero. Deploy with `--source .` and it builds automatically.

**Pub/Sub**: Message queue. Topics are named channels. Messages are base64-encoded in CloudEvent format — always decode with `Buffer.from(message.data, 'base64').toString()`.

**Eventarc**: Glue layer connecting Pub/Sub → Cloud Run. Triggers are separate resources. Requires a service account with `run.invoker` + `eventarc.eventReceiver`.

**Key insights**:
- Publishing returns immediately — processing is async. Perfect for background cloning.
- No polling needed — Eventarc invokes the function automatically.
- Use `gcloud run logs read` to debug.
- `gcloud config set` for defaults keeps commands clean.
