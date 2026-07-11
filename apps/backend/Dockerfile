FROM node:22-alpine AS base
# openssl: Prisma's query engine links against it on Alpine/musl.
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# ── Builder ───────────────────────────────────────────────────────────────────
# Copy the whole workspace (node_modules/dist/.next are dockerignored) so the
# frozen install sees every member — a partial set makes pnpm skip transitive
# deps like @fastify/multipart.
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @egofi/types build
RUN pnpm --filter @egofi/backend db:generate
RUN pnpm --filter @egofi/backend build

# ── Runner ────────────────────────────────────────────────────────────────────
# Preserve the monorepo layout so Node's module resolution finds the backend's
# own deps (apps/backend/node_modules, e.g. @fastify/multipart), the hoisted
# root deps (/app/node_modules), and the @egofi/types workspace symlink
# (apps/backend/node_modules/@egofi/types -> ../../packages/types).
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9.15.4 --activate
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

WORKDIR /app/apps/backend
EXPOSE 3000

# 127.0.0.1, not localhost: on Alpine `localhost` resolves to ::1 first while the
# app listens on IPv4, so a localhost probe is refused.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "dist/main.js"]
