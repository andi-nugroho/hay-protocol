# HayyProtocol Backend - Production Dockerfile
# Uses Bun for fast performance

FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Build stage (if needed for TypeScript compilation)
FROM base AS builder
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
# Uncomment if you need to build TypeScript
# RUN bun run build

# Production image
FROM base AS runner
WORKDIR /app

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 relayer

# Copy dependencies and source
COPY --from=deps --chown=relayer:nodejs /app/node_modules ./node_modules
COPY --chown=relayer:nodejs . .

# Create directory for state files and initialize empty state
RUN mkdir -p /app/data && \
    echo '{"lastStacksBlock":0,"processedEvents":{},"priceCache":{"stxUsd":0.5,"sbtcUsd":65000,"lastUpdate":0},"addressMappings":{}}' > /app/data/relayer-state.json && \
    chown -R relayer:nodejs /app/data

USER relayer

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3001/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Environment variables
ENV NODE_ENV=production
ENV STATE_FILE=/app/data/relayer-state.json

# Start the application
CMD ["bun", "src/index.ts"]
