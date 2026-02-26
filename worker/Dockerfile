# Agent worker: polls assistant_run_jobs, runs streamText, writes to assistant_run_events.
# Build from app root: docker build -f worker/Dockerfile -t terabits-worker .

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm ci

FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
CMD ["npx", "tsx", "worker/worker.ts"]
