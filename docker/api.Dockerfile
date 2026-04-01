# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages ./packages

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# ========================================
# Stage 2: Builder
# ========================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY package*.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Build the api
RUN cd apps/api && npm run build

# ========================================
# Stage 3: Runner
# ========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages ./packages

# Set permissions
RUN chown -R appuser:nodejs /app
USER appuser

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run
CMD ["node", "-r", "dotenv/config", "apps/api/dist/server.js"]
