# egofi

**Non-custodial crypto payment gateway.** Customers pay with any token on any chain; the merchant receives a single stablecoin, settled **directly to their own wallet** — funds never sit with egofi.

- 🔗 **Hosted checkout** — a shareable payment link / QR, live status, and an embeddable button & widget.
- 💱 **Any-token-in, one-asset-out** — same-network payments settle directly; cross-asset payments route through a swap provider (ChangeNOW → SimpleSwap failover).
- 🧾 **Invoices, subscriptions & integrations** — create payments from the dashboard or the REST API, with signed (IPN) webhooks.
- 🛡️ **Non-custodial by design** — one settlement address per network; egofi orchestrates, it never holds the float.

---

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Tenant isolation](#tenant-isolation)
- [Apps & ports](#apps--ports)
- [How a payment works](#how-a-payment-works)
- [Integrating egofi](#integrating-egofi)
- [Environment variables](#environment-variables)
- [Development](#development)

---

## Architecture

A pnpm + Turborepo monorepo.

```
apps/
  backend      NestJS + Fastify API, settlement engine, webhook ingest, BullMQ workers
  checkout     Next.js hosted checkout the customer pays on  (+ iframe embed mode)
  merchants    Next.js merchant dashboard (payments, subscriptions, developers, KYB)
  admin        Next.js operator back-office (merchant approvals, KYB review, fee policy)

packages/
  types        Shared DTOs, enums, chain configs (the source of truth for API shapes)
  sdk          Typed API client (@egofi/sdk) + a mock client for offline UI dev
  ui           Design system: Tailwind preset + shared React components
  config       Shared tsconfig / tooling
  domain       Pure domain logic
  testing      Test helpers
```

**Settlement rails** (`apps/backend/src/rails`)

- **Direct transfer** — same-asset/same-chain: a unique deposit amount is allocated to the merchant's own address; on-chain watchers detect and confirm it.
- **Swap provider** — cross-asset/cross-chain: an exchange is created with a provider (ChangeNOW primary, SimpleSwap fallback, health-scored), the payout address is cross-verified against the merchant's settlement address (anti-substitution), and the swap is polled to completion.

State changes are written to an append-only `PaymentEvent` log and a transactional **outbox**, so a merchant webhook fires **iff** the state actually changed.

---

## Tech stack

| Area         | Tech |
| ------------ | ---- |
| API          | NestJS 10, Fastify, class-validator |
| Data         | PostgreSQL + Prisma, Redis, BullMQ |
| Frontends    | Next.js 15 (App Router), React 19, Tailwind CSS |
| Tooling      | Turborepo, pnpm workspaces, Biome (lint + format), TypeScript, Husky |
| Integrations | Tatum (chain data/webhooks), ChangeNOW & SimpleSwap (swaps), Cloudinary (KYB docs) |

---

## Getting started

### Prerequisites

- **Node ≥ 20** and **pnpm ≥ 9** (`corepack enable` will provide pnpm)
- **Docker** (for Postgres + Redis)

### 1. Install

```bash
pnpm install
```

### 2. Start infrastructure (Postgres + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

This exposes **Postgres on `localhost:5433`** and **Redis on `localhost:6380`** (non-default host ports to avoid clashing with other local projects).

### 3. Configure the backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Then edit `apps/backend/.env` so the connection strings match the Docker host ports:

```env
# Runtime role — unprivileged, row-level security applies to it.
DATABASE_URL=postgresql://egofi_app:egofi_app_dev@127.0.0.1:5433/egofi
# Owner role — used only by `prisma migrate`.
DIRECT_DATABASE_URL=postgresql://egofi:egofi_dev@127.0.0.1:5433/egofi
REDIS_URL=redis://127.0.0.1:6380
```

Address the containers as `127.0.0.1`, not `localhost`. Compose binds them to the
IPv4 loopback only, and `localhost` can resolve to `::1` first — Node falls back
to IPv4, but Prisma's query engine does not.

Set the secrets you care about (`JWT_SECRET`, `WEBHOOK_SIGNING_SECRET`, `ADMIN_JWT_SECRET`, and any provider keys). See [Environment variables](#environment-variables).

### 4. Migrate & seed

```bash
pnpm --filter @egofi/backend db:migrate      # apply migrations (also creates the egofi_app role)
pnpm --filter @egofi/backend db:grant        # give egofi_app a password so the app can log in
pnpm --filter @egofi/backend db:generate     # generate the Prisma client
pnpm --filter @egofi/backend db:seed         # seed the admin user + global policies

# optional: seed a ready-to-use merchant login
pnpm --filter @egofi/backend db:seed:merchant
```

### 5. Run everything

```bash
pnpm dev            # runs all apps in parallel via Turborepo
```

Or run apps individually, e.g. `pnpm --filter @egofi/backend dev`.

> **Frontends without a backend:** the Next.js apps support a **mock mode** (`NEXT_PUBLIC_API_MODE=mock`) that serves simulated data via `@egofi/sdk`'s mock client — handy for UI work. Use each app's `dev:mock` script.

---

## Tenant isolation

Merchant data is fenced off twice.

Every merchant-facing service filters on `merchantId`, and Postgres row-level
security enforces the same thing underneath. On each authenticated merchant
request the app sets a transaction-local `app.current_merchant_id`; policies on
every tenant table compare it against the row's `merchantId`. A merchant-facing
query that forgets its `where` clause therefore returns nothing rather than
another merchant's rows.

Three things make this real rather than decorative:

- The app connects as `egofi_app`, which is `NOSUPERUSER NOBYPASSRLS`. Superusers
  and table owners bypass policies, so connecting as the owner would leave RLS
  looking enabled while doing nothing. `PrismaService` checks the role at boot
  and refuses to start if it is privileged.
- `PrismaService` returns an extended Prisma client from its constructor, so no
  injected client can skip the guard. Interactive transactions must go through
  `prisma.tenantTransaction()` — `prisma.$transaction()` would re-enter the
  query hook and split writes across two connections. A unit test enforces this.
- Adding a table with a `merchantId` column and no policy also fails the boot
  check, so a future migration cannot quietly opt out.

Public checkout, admin endpoints and background workers run with no merchant
context and are unrestricted, exactly as before. RLS is a guard against missing
filters, not against a compromised backend.

## Apps & ports

| App        | Dev URL                 | Purpose |
| ---------- | ----------------------- | ------- |
| backend    | http://localhost:3000   | REST API + Swagger docs at `/docs` |
| checkout   | http://localhost:3001   | Customer-facing hosted checkout (`/pay/:invoiceId`) |
| merchants  | http://localhost:3002   | Merchant dashboard |
| admin      | http://localhost:3003   | Operator back-office |

Also from Docker: Prometheus `:9091`, Grafana `:3100`.

---

## How a payment works

1. **Create** — the merchant creates an invoice from the dashboard or the API. It's priced in a display currency (e.g. USD) and quoted into the pay asset.
2. **Pay** — the customer opens the hosted checkout, sees the exact amount + deposit address + QR, and sends the crypto (or opens it in a connected wallet).
3. **Settle** — egofi detects the deposit, converts if needed, and pays out to the **merchant's own settlement address**. The checkout tracks each step live (Waiting → Processing → Completed).
4. **Notify** — the merchant receives a **signed webhook** on each event and can reconcile the order.

---

## Integrating egofi

Everything below is available in the merchant dashboard under **Developers**.

### 1 · Create a payment (server-side, with your API key)

```bash
curl -X POST http://localhost:3000/invoices \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayCurrency": "USD",
    "displayAmount": "49.99",
    "payAsset": "USDT",
    "payChain": "TRON",
    "metadata": { "orderId": "ORDER-1234" }
  }'
# → { "id": "inv_...", ... }
```

Then redirect the customer to the hosted checkout: `http://localhost:3001/pay/{id}`
(or embed the **button / widget** snippet from the invoice's detail page).

### 2 · Receive the webhook (IPN)

Save your **Callback URL** and generate an **IPN secret** in the dashboard. egofi POSTs a signed
notification on every payment event:

```http
POST  https://your-store.com/webhooks/egofi
x-egofi-signature: sha256=<hmac-sha256 of the raw body>

{ "event": "invoice.paid", "invoiceId": "inv_...", "data": { "state": "PAID_CONFIRMED", ... }, ... }
```

Events: `invoice.paid` · `invoice.failed` · `invoice.expired` · `invoice.underpaid` · `invoice.refunded` · `invoice.compliance_hold`

### 3 · Verify the signature, then fulfil the order

```js
import crypto from "node:crypto";

app.post("/webhooks/egofi", express.raw({ type: "*/*" }), (req, res) => {
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", process.env.EGOFI_IPN_SECRET).update(req.body).digest("hex");
  const ok = crypto.timingSafeEqual(
    Buffer.from(req.headers["x-egofi-signature"]),
    Buffer.from(expected),
  );
  if (!ok) return res.status(401).send("bad signature");

  const event = JSON.parse(req.body.toString());
  if (event.event === "invoice.paid") {
    // ✅ mark order paid
  }
  res.sendStatus(200);
});
```

> All mutating API requests require an **`Idempotency-Key`** header — retrying with the same key replays the original response instead of creating a duplicate.

Full interactive reference is served at `http://localhost:3000/docs` (OpenAPI/Swagger).

---

## Environment variables

Backend (`apps/backend/.env`) — see `apps/backend/.env.example` for the full list:

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres connection for the app. **Must be the unprivileged `egofi_app` role** — a superuser silently bypasses row-level security, so the backend refuses to start as one. Host port `5433` in dev |
| `DIRECT_DATABASE_URL` | Postgres connection for `prisma migrate` only, as the schema owner. App processes never open it; set it equal to `DATABASE_URL` there if you don't want owner credentials on app hosts |
| `REDIS_URL` | Redis connection (use host port `6380` in dev) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Merchant session signing (default 7d) |
| `ADMIN_JWT_SECRET` | Separate secret for operator sessions |
| `WEBHOOK_SIGNING_SECRET` | Fallback HMAC secret for outbound webhooks (per-merchant IPN secrets override it) |
| `TATUM_API_KEY`, `TATUM_WEBHOOK_HMAC_SECRET` | Chain data + deposit webhooks |
| `CHANGENOW_API_KEY`, `SIMPLESWAP_API_KEY` | Swap providers |
| `CLOUDINARY_*` | Private KYB document storage |

Frontends read `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHECKOUT_URL`, and `NEXT_PUBLIC_API_MODE` (`dev` | `mock` | `production`).
Set `NEXT_PUBLIC_SITE_URL` to each app's public origin in production so the Open Graph share card resolves to an absolute URL.

---

## Development

```bash
pnpm dev              # run all apps (Turborepo, parallel)
pnpm build            # build everything
pnpm typecheck        # type-check every package
pnpm test             # run tests
pnpm check            # Biome lint + format (write)
```

Per-package with `pnpm --filter @egofi/<name> <script>`.

**Conventions**

- **Biome** handles linting + formatting; a Husky pre-commit hook runs `lint-staged` + affected typechecks.
- **`@egofi/types`** is the single source of truth for API shapes — change a DTO there and both the SDK and the apps follow.
- The backend injects providers by **value import** (not `import type`) — NestJS relies on the reflected type metadata, which `import type` erases. `apps/backend/biome.json` disables `useImportType` to keep it that way.

---

## License

Proprietary — © egofi. All rights reserved.
