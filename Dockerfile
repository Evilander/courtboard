FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV AUTH_SECRET=docker-build-secret-change-at-runtime
ENV AUTH_URL=http://127.0.0.1:3000
ENV DATABASE_URL=file:./data/courtboard.db
ENV COURTHOUSE_NAME=CourtBoard
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts ./scripts
RUN mkdir -p /app/data /app/public/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && node server.js"]
