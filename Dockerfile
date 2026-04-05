# --- Stage 1: deps ---
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --ignore-scripts
RUN npx prisma generate

# --- Stage 2: builder ---
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_ vars must be present at build time (inlined by Next.js)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_LOG_LEVEL
ARG NEXT_PUBLIC_VENMO_HANDLE

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Stage 3: runner ---
FROM node:20-alpine AS runner
WORKDIR /app

LABEL org.opencontainers.image.source=https://github.com/aptx-health/ripit-fitness

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma migrations + exercise data sync (for k8s init container)
COPY --from=builder /app/prisma ./prisma
RUN npm install prisma@6.19.0 tsx@4.19.4 typescript@5.8.3 @types/node@22.15.3 --save-exact --no-audit --no-fund --ignore-scripts
# Copy Prisma engines from deps stage and fix ownership
# npm install above creates @prisma/ owned by root; engines need to be writable by nextjs at runtime
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
RUN chown -R nextjs:nodejs ./node_modules/@prisma ./node_modules/prisma
COPY scripts/prisma-migrate.sh ./scripts/prisma-migrate.sh
COPY scripts/sync-exercise-data.ts ./scripts/sync-exercise-data.ts
COPY scripts/exercise-mapping.json ./scripts/exercise-mapping.json
COPY scripts/validated-exercise-ids.json ./scripts/validated-exercise-ids.json
RUN chmod +x ./scripts/prisma-migrate.sh

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
