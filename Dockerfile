FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
ARG AUTH_SECRET=docker-build-placeholder
ARG AUTH_URL=http://127.0.0.1:3000
ARG DATABASE_URL=file:./data/courtboard.db
ARG COURTHOUSE_NAME=CourtBoard
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=America/Chicago
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts ./scripts
RUN mkdir -p /app/data /app/public/uploads && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "if [ -f /app/data/courtboard.db ]; then cp /app/data/courtboard.db /app/data/courtboard.db.pre-migrate-$(date +%s); fi && node scripts/migrate.mjs && npm run start"]
