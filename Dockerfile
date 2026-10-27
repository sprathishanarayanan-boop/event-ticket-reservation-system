# Multi-stage Dockerfile for Multi-Tenant Event & Ticket Reservation System
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json tsconfig*.json vite.config.ts tailwind.config.js postcss.config.js index.html ./

# Install dependencies
RUN npm ci

# Copy source code and scripts
COPY src ./src
COPY scripts ./scripts

# Build React client and TypeScript server
RUN npm run build

# --- Production Image ---
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package definitions and install production only dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts and schema
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/server/db/schema.sql ./dist/server/db/schema.sql
COPY --from=builder /app/src/server/db/schema.sql ./src/server/db/schema.sql

# Create data directory for sqlite database fallback
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
