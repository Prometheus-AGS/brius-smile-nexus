FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install Yarn
RUN corepack enable && corepack prepare yarn@4.9.0 --activate

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
FROM base AS deps
RUN yarn install --immutable

# Build the app
FROM deps AS builder
COPY . .
RUN yarn build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Install only production dependencies
RUN corepack enable && corepack prepare yarn@4.9.0 --activate && \
    yarn workspaces focus --production

# Expose the port the app runs on
EXPOSE 4173

# Command to run the app
CMD ["yarn", "preview", "--host"]
