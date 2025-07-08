# Healthcare Data Migration System Dockerfile
# Multi-stage build for production-ready migration container

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    bash \
    jq

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S migration -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

# Copy configuration files
COPY docker/migration/entrypoint.sh ./
COPY docker/migration/healthcheck.sh ./

# Create necessary directories
RUN mkdir -p logs backups temp && \
    chown -R migration:nodejs /app

# Make scripts executable
RUN chmod +x entrypoint.sh healthcheck.sh

# Switch to non-root user
USER migration

# Expose ports
EXPOSE 3000 9090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ./healthcheck.sh

# Set entrypoint
ENTRYPOINT ["./entrypoint.sh"]

# Default command
CMD ["migration"]