FROM node:20-slim AS base

# Install system dependencies required for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

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

# Production image using nginx to serve static files
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy static assets from builder stage
COPY --from=builder /app/dist ./

# Copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port the app runs on
EXPOSE 80

# Command to run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
