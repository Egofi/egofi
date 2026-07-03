FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY packages/sdk/package.json packages/sdk/
COPY apps/checkout/package.json apps/checkout/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ packages/
COPY apps/checkout/ apps/checkout/
RUN pnpm --filter @egofi/types build
RUN pnpm --filter @egofi/sdk build
RUN pnpm --filter @egofi/ui build
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @egofi/checkout build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/apps/checkout/.next/standalone ./
COPY --from=builder /app/apps/checkout/.next/static ./apps/checkout/.next/static
COPY --from=builder /app/apps/checkout/public ./apps/checkout/public

EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/checkout/server.js"]
