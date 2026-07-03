FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/sdk/package.json packages/sdk/
COPY apps/merchants/package.json apps/merchants/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ packages/
COPY apps/merchants/ apps/merchants/
RUN pnpm --filter @egofi/types build
RUN pnpm --filter @egofi/sdk build
RUN pnpm --filter @egofi/ui build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @egofi/merchants build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/merchants/.next/standalone ./
COPY --from=builder /app/apps/merchants/.next/static ./apps/merchants/.next/static
COPY --from=builder /app/apps/merchants/public ./apps/merchants/public

EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/merchants/server.js"]
