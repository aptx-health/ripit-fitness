# Build context is the REPO ROOT (not this directory) so the worker can
# import shared code from lib/. Build with:
#   docker build -f cloud-functions/clone-program/Dockerfile .
# Context ignores come from Dockerfile.dockerignore next to this file (BuildKit).
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/cloud-functions/clone-program
COPY cloud-functions/clone-program/package*.json ./
# Always use the canonical schema from the repo root (single source of truth)
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm install
# Shared lib/ code lives at /app/lib; Node walks up from there looking for
# node_modules, so expose the worker's node_modules at /app/node_modules.
RUN ln -s /app/cloud-functions/clone-program/node_modules /app/node_modules
RUN npx prisma generate
# Shared code: worker imports from lib/ via the @/* path alias (see tsconfig.json)
COPY lib /app/lib
COPY cloud-functions/clone-program/tsconfig.json ./tsconfig.json
COPY cloud-functions/clone-program/src ./src
RUN npm run build
RUN npm prune --production
EXPOSE 8080
CMD ["npm", "start"]
