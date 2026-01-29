# Overmind Procfile for local development
# Run with: overmind start
# Individual process control: overmind restart worker | overmind connect app

emulator: ./scripts/start-pubsub-emulator.sh
worker: cd cloud-functions/clone-program && PORT=8082 doppler run --config dev_personal -- npm run dev
app: doppler run --config dev_personal -- npm run dev
