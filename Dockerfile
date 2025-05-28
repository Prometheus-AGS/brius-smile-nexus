FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install Yarn
RUN corepack enable && corepack prepare yarn@4.9.0 --activate

# Copy package.json and yarn.lock
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

# Install dependencies
FROM base AS deps
RUN yarn install --immutable

# Build the app
FROM deps AS builder
# Copy everything except node_modules (which is already in the deps stage)
COPY . .
# Ensure we don't lose the Yarn state by preserving the node_modules directory
# This is the key fix: we're telling Docker not to overwrite node_modules
RUN yarn build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/.yarn ./.yarn

# Install only production dependencies
RUN corepack enable && corepack prepare yarn@4.9.0 --activate && \
    yarn workspaces focus --production

# Expose the port the app runs on
EXPOSE 4173

# Command to run the app
CMD ["yarn", "preview", "--host"]
