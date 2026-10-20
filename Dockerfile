FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY liftledger/package.json liftledger/package-lock.json ./
RUN npm ci --only=production

# Build the app
FROM base AS builder
WORKDIR /app
COPY liftledger/package.json liftledger/package-lock.json ./
RUN npm ci
COPY liftledger .
RUN npm run build

# Production image
FROM base
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy built app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY liftledger/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
