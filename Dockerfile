# ── Build stage ──────────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace manifests first for layer caching
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/ui/package.json packages/ui/

RUN npm ci --include=dev

# Copy source and build all packages
COPY packages/ packages/

RUN npm run build --workspace=packages/core \
 && npm run build --workspace=packages/server \
 && npm run build --workspace=packages/ui

# ── Production stage ─────────────────────────────────────────
FROM node:22-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/ui/package.json packages/ui/

RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY --from=build /app/packages/ui/dist packages/ui/dist

# Copy schema.sql needed by core at runtime
COPY packages/core/src/db/schema.sql packages/core/dist/db/schema.sql

ENV NODE_ENV=production
ENV NOVELMAP_PORT=3001

EXPOSE 3001

# Data directory for SQLite database
VOLUME ["/data"]
ENV NOVELMAP_DB_PATH=/data/novelmap.db

CMD ["node", "packages/server/dist/index.js"]
