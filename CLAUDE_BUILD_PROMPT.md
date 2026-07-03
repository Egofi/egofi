# Simbi — Build Specification (TypeScript)

**Owner:** Nuelgreen AI
**Nature:** Non-custodial crypto-in / crypto-out payment gateway for African merchants
**Core promise:** *A customer pays with any supported token on any supported chain; the merchant receives their chosen crypto (e.g. USDT-Tron). No fiat. The gateway never holds customer funds.*

Build-to-last, not MVP-in-a-box. Optimize for a durable, modular core and great UX. Everything is **TypeScript** except one unavoidable on-chain contract in v2 (Solidity). Open choices are marked **[DECISION]**, never guessed.

---

## 0. Non-negotiable design principles

1. **The gateway never custodies funds.** When conversion transiently needs custody, it lives with an external swap provider — never in a Simbi key or wallet.
2. **One settlement abstraction, many rails.** All payment mechanics sit behind a single `SettlementRail` interface. The invoice/checkout/webhook core never knows which rail it's using. This is what lets v2 slot in without a rewrite.
3. **Confirm on the output leg.** An invoice is `PAID_CONFIRMED` only when the *merchant's* asset lands in the *merchant's* wallet — never when the customer's deposit is seen.
4. **Everything typed, nothing floats.** Strict TypeScript everywhere; no floating promises in payment paths. Money-losing bugs are almost always unhandled async or untyped boundaries.
5. **Money-movement is a regulated activity.** Every rail decision is also a compliance decision (§10).

---

## 1. Repository & codebase layout

A single **pnpm + Turborepo monorepo** houses four independently deployable services plus shared typed packages. One repo, one CI gate, shared types that cannot drift — but each app ships, scales, and is managed on its own.

```
simbi/
├── apps/
│   ├── backend/        # NestJS — API + settlement engine (runs as api / worker / webhook-ingest roles)
│   ├── checkout/       # Next.js — public customer-facing payment page + embeddable widget
│   ├── merchants/      # Next.js — merchant dashboard
│   └── admin/          # Next.js — superadmin back-office
├── packages/
│   ├── types/          # @simbi/types  — shared domain types, enums, DTOs (single source of truth)
│   ├── sdk/            # @simbi/sdk    — generated typed client for the backend API (used by checkout + merchants + admin)
│   ├── ui/             # @simbi/ui     — shared design-system components (checkout + merchants + admin)
│   ├── config/         # @simbi/config — shared tsconfig, biome config, test config
│   └── contracts/      # @simbi/contracts — (v2) Solidity + typechain-generated types
├── biome.json
├── turbo.json
├── pnpm-workspace.yaml
└── .github/workflows/ci.yml
```

**The four services:**

| Service | Framework | Exposure | Audience | Owns |
|---------|-----------|----------|----------|------|
| **backend** | NestJS | private API + public webhook ingest | internal | Settlement engine, all rails, jobs, ledger, Tatum/provider integrations, checkout-session API |
| **checkout** | Next.js | **public** | customers | Payment page, QR/amount/countdown, live status, embeddable widget. Talks only to the backend checkout-session API |
| **merchants** | Next.js | authenticated | merchants | Onboarding, settlement config, invoices/links, transactions, API keys, webhooks, reports |
| **admin** | Next.js | authenticated (internal) | Simbi operators | Merchant approval, compliance queues, provider/fee config, reconciliation, monitoring |

The frontends never touch the database — they consume the backend through the typed `@simbi/sdk`. That's the boundary that keeps them independently managed.

### Service topology & deployment (what "easily managed" means here)

**Monorepo for code, independent services for runtime.** Shared types + one CI gate at build time; four separately deployable, separately scalable units at run time. You get service isolation without four codebases to maintain.

The **backend is one codebase deployed in up to three process roles** (same image, different entrypoint) so you scale each concern on its own axis:

| Role | Handles | Scales on | Exposure |
|------|---------|-----------|----------|
| `backend:api` | REST API for checkout/merchants/admin | user/API traffic | private (behind gateway) |
| `backend:worker` | BullMQ workers (§8) | job volume | internal only |
| `backend:webhook` | inbound Tatum/provider webhooks | chain/provider event rate | **public**, must be highly available |

Splitting `webhook` from `api` matters: a dropped webhook is a missed payment detection, so the ingest endpoint should stay up and scale independently of dashboard traffic. Start with `api`+`webhook` merged if you want fewer moving parts; split when volume justifies it. **[DECISION]** merge vs split the webhook role at launch.

**Deployment target — [DECISION], recommended: DigitalOcean App Platform.** Point it at the monorepo; define one component per app (`checkout`, `merchants`, `admin`) plus the backend roles as components/workers. Each redeploys on change to its own paths, each scales independently, TLS and routing are managed. Shared **managed Postgres + managed Redis**. This is the lowest-ops way to run four services. The Droplet + Docker Compose + Nginx path (which you've run before) also works and costs less, at the price of managing it yourself.

Each app has its own Dockerfile; Turborepo's affected-path detection means a checkout change doesn't rebuild the admin, and vice versa.

> **[DECISION]** If you ever need four *separate git repos* instead of a monorepo, publish `@simbi/types` + `@simbi/sdk` as private packages so the services still share types. Monorepo is strongly recommended for the single-gate + no-drift benefit.

---

## 2. Standard stack (chosen — best-in-class for this workload)

| Concern | Choice | Why |
|---------|--------|-----|
| Language | **TypeScript** (strict) | One language across backend, both frontends, and integrations |
| Backend framework | **NestJS** | Module/DI architecture maps 1:1 onto the rail abstraction; enforces modularity |
| Frontends | **Next.js (App Router)** | Shared UI + types with backend |
| Background jobs | **BullMQ** (Redis) | Delayed/repeatable/retry/concurrency — exactly the settlement workload |
| Durable-saga | **Not adopted — BullMQ + persisted state machine** | Locked. Idempotent jobs + explicit state give the durability needed without a Temporal cluster |
| ORM | **Prisma** | Type-safe queries + migrations. *(Drizzle = lighter alt)* |
| DB | **PostgreSQL** | Invoices, ledger, merchants |
| Cache/queue/locks | **Redis** | BullMQ, rate locks, amount-pool reservations, cooldowns |
| Runtime validation | **Zod** | Validate every external boundary (webhooks, provider responses, API input) → inferred types |
| Public API contract | **REST + OpenAPI** | Language-agnostic for merchants integrating; generates the typed SDK |
| Lint + format | **Biome** | The "Ruff of TS": one fast Rust tool. + promise-safety rules |
| Type-check | **`tsc --noEmit` strict** | The "mypy of TS" |
| Tests | **Vitest** + **Playwright** | Unit/integration + end-to-end checkout |
| Logging | **pino** (structured) | JSON logs → aggregation |
| Errors/observability | **Sentry** + OpenTelemetry | Trace payment flows |
| Chain access | **Tatum SDK** | Notifications + RPC across all chains |
| EVM libs (v2) | **viem** | Modern EVM client |
| Solana / Tron libs | **@solana/web3.js**, **TronWeb** | Native SDKs |
| Swap provider (v1) | **ChangeNOW** (primary) + **SimpleSwap** (fallback) | Deposit-address instant swap; USDT-TRC20 destination; fixed-rate flow; 0.4% adjustable fee-share |
| Swap router (v2) | **RocketX** (primary) + **Rango** (fallback) | Wallet-connect CEX+DEX; verified Tron destination; default integrator fee-share |
| Contract toolchain (v2) | **Foundry** (or Hardhat) + **typechain** | Solidity dev/test + typed bindings |

---

## 3. Code-quality gate (mandatory before merge)

**Rule: no code enters `main` unless lint, format, type-check, and tests all pass.**

### 3.1 Local (fast feedback)
- **Husky** git hooks + **lint-staged**:
  - pre-commit → Biome (format + lint) on staged files, `tsc --noEmit` on affected packages
  - pre-push → Vitest on affected packages
- One command mirrors CI: `pnpm turbo run lint typecheck test build`

### 3.2 CI — `.github/workflows/ci.yml` (runs on every PR)
```
1. pnpm install --frozen-lockfile
2. turbo run lint        # biome check (lint + format --check) across all apps/packages
3. turbo run typecheck   # tsc --noEmit, strict, every package
4. turbo run test        # vitest; checkout e2e via Playwright
5. turbo run build       # all apps must build
```
Turborepo runs these across all three codebases + shared packages in one pass, caching unchanged targets.

### 3.3 Branch protection (GitHub)
- `main` protected: no direct pushes.
- PR required + **all CI checks green** + ≥1 review before merge.
- Merge button blocked until the gate passes. This is the "must pass before it can be integrated" enforcement.

### 3.4 Strict TypeScript config (`packages/config/tsconfig.base.json`) — the mypy-strict equivalent
```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

### 3.5 Biome (`biome.json`) — the Ruff equivalent
- Formatter on; recommended lint rules on.
- **Enable promise-safety** (`noFloatingPromises` / no-misused-promises). Non-negotiable in payment code.
- Import organizing on. **[DECISION]** if a needed type-aware rule is missing in Biome, add a minimal `typescript-eslint` overlay for that one rule only — don't reintroduce full ESLint sprawl.

---

## 4. The `SettlementRail` abstraction (the spine)

Every payment method — now and future — implements one interface. In NestJS each rail is a module/provider; the router injects them.

```ts
// packages/types
type RailStatus =
  | 'AWAITING' | 'RECEIVED' | 'CONVERTING' | 'PAYOUT_SENT'
  | 'SETTLED'  | 'UNDERPAID' | 'FAILED'    | 'REFUNDED' | 'EXPIRED';

interface SettlementRail {
  createPayment(invoice: Invoice): Promise<PaymentInstructions>;
  getStatus(paymentRef: string): Promise<RailStatus>;
  handleWebhook(payload: unknown): Promise<RailEvent>;      // Zod-validated inside
  supports(q: RouteQuery): boolean;                          // used by the router
}
```

| Rail | Version | Mechanic | Custody | Reaches |
|------|---------|----------|---------|---------|
| `DirectTransferRail` | v1 (baseline) | Plain transfer, no conversion | None (true) | Anyone, incl. exchanges |
| `SwapProviderRail` | **v1 (primary)** | Deposit-address swap service | Provider (transient) | Anyone, incl. exchanges |
| `WalletConnectRail` | v2 | Smart-contract router, customer signs | None (true) | Self-custody wallets only |
| `RecurringRail` | v2 | Approve + pull (stablecoin) | None (true) | Self-custody wallets only |

The core (invoice, checkout, webhooks, dashboard, ledger) is written **once** against the interface. Rails are pluggable.

---

## 5. Backend module map (NestJS)

```
apps/backend/src/
├── core/          # config, health, logging (pino), request context
├── auth/          # merchant auth, API keys, admin auth, JWT + RBAC
├── merchants/     # merchant CRUD, settlement config, address management
├── invoices/      # invoice lifecycle + unified state machine (§12)
├── checkout/      # checkout-session API (create/read session, live status) — consumed by the checkout app
├── rails/
│   ├── rail.interface.ts
│   ├── rail.router.ts            # layered selection (§7)
│   ├── direct-transfer/          # v1 baseline
│   ├── swap-provider/            # v1 primary
│   │   └── providers/            # changenow / simpleswap adapters (SwapProvider abstraction, v1)
│   ├── wallet-connect/           # v2 — rocketx / rango router adapters
│   └── recurring/                # v2
├── chain/         # Tatum notifications + RPC; per-chain adapters (evm, tron, solana, bitcoin); confirmation policy (§9)
├── pricing/       # rate quotes (CoinGecko), rate locks in Redis
├── webhooks/      # inbound (Tatum, providers, Zod-validated + HMAC) + outbound (merchant webhooks, signed, retried)
├── ledger/        # record-of-truth entries, reconciliation reads
├── jobs/          # BullMQ queues + workers (§8)
├── notifications/ # merchant/customer notifications
├── compliance/    # KYC hooks, review queues, limits
└── admin-api/     # endpoints backing the admin app (queues, reconciliation, provider/fee config)
```

Each rail is a self-contained module; adding v2 rails = adding two modules, not editing the core.

---

## 6. Supported chains & assets

XRP removed. One address serves a whole family:

| Family | Merchant provides | Receives | Native gas |
|--------|-------------------|----------|------------|
| EVM | one `0x…` | ETH/BNB/POL/Base-ETH + all ERC-20/BEP-20 | per-chain |
| Tron | one `T…` | TRX + all TRC-20 (USDT-TRON) | TRX/Energy |
| Solana | one address | SOL + all SPL | SOL |
| Bitcoin | one address | BTC | BTC fee |

**Settlement asset** merchant-configured, default **USDT-Tron**. Merchants paste ≤4 addresses to cover every network. **Stablecoin-first:** most inbound is USDT/USDC across Tron/BSC/Solana/Polygon — design defaults, copy, and rate logic around stablecoins; treat volatile natives (BTC/ETH/SOL/BNB) as the secondary case.

---

## 7. Rail router (layered model)

On invoice creation, given `(fromAsset, fromChain → settlementAsset/chain, amount)`, select in priority order:

1. **Same asset + same chain as settlement** → `DirectTransferRail`. No conversion, no provider, zero custody.
2. **Below swap-provider minimum (~$20–50 eq)** → `DirectTransferRail` in the requested asset if the merchant accepts as-is; else reject with a clear "minimum for conversion is X". **Never** silently route a sub-minimum swap.
3. **Cross-token / cross-chain** → `SwapProviderRail`.
4. *(v2)* Customer chose "connect wallet for best rate / subscription" → `WalletConnectRail` / `RecurringRail`.

Router is the only place that knows priority logic. Rails stay dumb.

---

## 8. Background jobs (BullMQ)

Workers live in `apps/backend` (deployed as a separate worker process, same codebase & Prisma models). Queues:

| Queue | Trigger | Job |
|-------|---------|-----|
| `deposit-watch` | Tatum notification | match deposit → invoice, advance state |
| `swap-status-poll` | repeatable (per active swap) | poll provider until payout leg confirmed |
| `confirmation-watch` | on payout seen | wait per-chain confirmations (§9) → `PAID_CONFIRMED` |
| `merchant-webhook` | on confirmed/failed | deliver signed webhook, retry w/ backoff, dead-letter |
| `rate-lock-expiry` | delayed (per invoice) | expire quote/invoice when window elapses |
| `cooldown-release` | delayed | release DirectTransfer amount back to pool after cooldown |
| `recurring-scheduler` *(v2)* | cron per subscription | trigger approve-pull cycle |
| `reconciliation` | cron (daily) | ledger vs on-chain balances report |

Every job is **idempotent** (keyed on invoice + leg + tx hash) so retries never double-count. **Locked: BullMQ + the persisted state machine (§12) is the settlement engine — no Temporal.** Durability comes from idempotency keys, retries with backoff, and dead-letter queues, all reconciled daily against on-chain state.

---

## 9. Confirmation policy (per chain)

Settle only after destination-side confirmations; keep **matching** (on detection) separate from **confirmation** (on threshold). Merchant webhook fires on confirmation.

| Chain | Guideline |
|-------|-----------|
| Tron | ~19 blocks / SR confirmation |
| BSC / Polygon / Base | ~12 blocks (or Tatum "confirmed") |
| Solana | finalized commitment |
| Ethereum L1 | ~12 blocks (flag high gas for small tickets) |
| Bitcoin | 1–2 confs (slower → longer countdowns) |

---

## 10. v1 rails in detail

### 10.1 `DirectTransferRail` (baseline, non-custodial)
- **Detection:** Tatum `ADDRESS_EVENT` (native + fungible) per merchant address per chain; payload carries asset/contract + amount.
- **Shared-address disambiguation:** unique exact amount per open invoice on `(address, token)`, allocated from a pool (smallest unused increment, steps of 0.0001), **integer base units only, never floats**. Match on `(address, token, exact base-unit amount, within window)`.
- **Pre-fill amount via payment URIs** so the customer never types it: EIP-681 (EVM), Solana Pay, TronLink deep-link, BIP-21 (BTC). QR generated from these.
- **Cooldown:** after expiry keep the amount reserved ~2× the window before release, so a late straggler still attributes correctly (correctness, not cosmetic).
- **Underpayment** (esp. exchange fee-netting) → `UNDERPAID` review queue; no tolerance widening.
- **xpub "pro mode" is a per-merchant setting** (merchant toggles it in their own settings). When ON, derive a fresh address per invoice → zero amount ambiguity. When OFF (default), use the merchant's plain address + amount-fingerprint. Surface it in the merchant app with a recommendation to enable it for BTC, where multi-address wallets handle it natively.

### 10.2 `SwapProviderRail` (v1 primary, custody outsourced)
Any token/chain in → merchant's settlement asset out via a deposit-address swap service. Simbi never touches funds.

**Provider abstraction (durability):** a `SwapProvider` sub-interface over multiple services; quote/route/failover across them.

**Locked — primary: ChangeNOW, fallback: SimpleSwap.** ChangeNOW is a true deposit-address instant-swap service, which is what v1's "send crypto and pay" flow needs: create exchange → receive a deposit address → customer sends a plain transfer from any wallet *or exchange* → it converts and forwards to the merchant. It supports **USDT-TRC20 as a destination** across 110+ chains, exposes a **fixed-rate flow** (predictable merchant settlement), takes a **refund address**, has a per-pair **min-amount** endpoint (query it at quote time), and pays a default **0.4% adjustable fee-share** — your v1 monetization built in. SimpleSwap is the same deposit-address model as fallback. Query minimums per pair at runtime through the `SwapProvider` interface; sub-minimum routes fall back to `DirectTransferRail` (§7).

> Note: **RocketX is a wallet-connect aggregator** (user confirms each swap in their wallet), so it does *not* fit the v1 deposit-address flow — it's the v2 router (§11.1), where its default fee-share and CEX+DEX Tron support shine.

**Flow:**
1. Merchant sets settlement asset + address once.
2. Customer picks pay-asset/chain → `createExchange({ from, to, recipient: merchantAddr, refundAddr, rateType: 'fixed' })`.
3. Provider returns deposit address + exact amount + provider tx id → render address + QR + amount + countdown.
4. Customer sends a plain transfer (any wallet or **exchange**).
5. `swap-status-poll` / provider webhook → normalized rail events.
6. `PAID_CONFIRMED` only when the **payout leg** lands.

**Great-UX requirements (first-class):**
- Live status surfaced to customer: `Deposit detected → Converting → Payout sent → Confirmed`, with estimates.
- **Fixed-rate quotes** → predictable merchant settlement; short validity maps onto the countdown.
- **Refund-address story:** mandatory; warn/collect for exchange payers (CEX refunds can be lost).
- **Minimums** shown before commit; sub-minimum → baseline rail or clear message.
- **Stuck/failed swaps:** explicit `FAILED → REFUNDED` branch, customer-visible, never limbo.
- **Wallet deep-links** pre-filling amount for mobile-wallet users.

---

## 11. v2 rails in detail (Family 1 — wallet-connect)

Added behind the same `SettlementRail` interface. Two sub-flows share wallet-connect.

### 11.1 One-time "pay with anything → merchant asset" (customer present, signs)
- Router via SDK — **locked: RocketX (primary) + Rango (fallback).** RocketX is the standout for your case: wallet-connect CEX+DEX routing across 200+ chains, **verified Tron/TRC-20 destination**, fixed-rate quotes, audited (Zokyo, Network Intelligence, ~$2B volume), zero platform fee under $100 (good for small tickets), a JS SDK — and, uniquely, **default integrator fee-share on every swap** (LI.FI/Socket don't offer this), which is your v2 revenue. Rango is the fallback for non-EVM route breadth. LI.FI is EVM-strong but thin on Tron-destination, so it is not primary given USDT-Tron settlement.
- Customer connects wallet (MetaMask/Phantom/TronLink/WalletConnect via viem/wagmi), signs one tx, receives merchant asset. Truly non-custodial. Optional integrator fee = revenue.
- Bridge/route risk is real (repeated 8–9-figure exploits) → prefer routes minimizing lock-and-mint; drive UX from status, not origin tx.

### 11.2 Recurring subscriptions (customer NOT present each cycle)
**Constraint:** no per-cycle conversion (nobody signs) → **recurring = stablecoin in, stablecoin out, same chain** (as DigitalOcean constrained theirs to stablecoin wallet payments + upfront authorization). At most a same-chain stable→stable swap.

**Authorization model — admin-selected, one active model takes effect.** The admin sets the active model in a `RecurringPolicy` (admin app); the recurring flow uses whichever is active. All three implement the same `RecurringRail` interface, so switching is a config change, not a rewrite:

| Model | Works on | Notes |
|-------|----------|-------|
| Approve + pull (allowance) | EVM **and Tron** | Simplest; customer must keep balance funded; standing approval is a security surface. **Only option on Tron.** |
| Smart-account session keys (ERC-4337) | EVM only | Best UX/safety (scoped, revocable, capped); needs smart-account wallet; **not on Tron** |
| Streaming (Superfluid) | EVM | Elegant, unusual UX |

**Default active model: approve + pull** — also the only one that works on Tron, which matters since USDT-Tron is settlement. Admin can switch to session-keys for an EVM-only merchant base.

**Build vs buy — also admin-selected.** The same `RecurringPolicy` sets whether the active recurring *engine* is the in-house Solidity approve+pull contract or a bought-in provider (Sphere / Loop Crypto / Radom). Whichever is active takes effect; both sit behind the `RecurringRail` interface.

**The one Solidity piece** (only if the in-house engine is active): the approve+pull subscription contract in `packages/contracts` (Foundry + typechain → typed bindings consumed by the TS backend). Scope Solidity to exactly this small, audited contract; everything else stays TypeScript.

---

## 12. Invoice state machine (unified across rails)

```
DRAFT
 └─ AWAITING_PAYMENT  (instructions + rate + window issued)
     ├─ RECEIVED        (deposit seen — NOT yet paid)
     │   └─ CONVERTING   (SwapProviderRail only)
     │       └─ PAYOUT_SENT
     │           └─ PAID_CONFIRMED  (payout confirmed on dest → merchant webhook)
     ├─ UNDERPAID       → review queue
     ├─ OVERPAID        (paid + delta recorded)
     └─ FAILED          → REFUNDED (to refundAddress) | UNMATCHED review
 └─ EXPIRED             (window elapsed; DirectTransfer amount → COOLDOWN → RELEASED)
```

---

## 13. Data model (Prisma, rail-agnostic)

```prisma
model Merchant {
  id                 String   @id @default(cuid())
  business           String
  settlementAsset    String
  settlementAddresses Json    // { evm, tron, solana, bitcoin }
  xpub               String?  // optional pro-mode
  webhookUrl         String?
  xpubMode           Boolean  @default(false) // per-merchant "pro mode" (§10.1)
  feeOverride        Json?    // optional per-merchant override of the global FeePolicy
  apiKeys            ApiKey[]
  invoices           Invoice[]
}

// Admin-level, operator-configured policies (single active config, global defaults):
//   FeePolicy       — per-mechanism { status: active|deprecating|disabled, params } (§15)
//   RecurringPolicy — active auth model + active engine (build vs buy) (§11.2)

model Invoice {
  id               String   @id @default(cuid())
  merchantId       String
  displayCurrency  String
  displayAmount    Decimal
  payAsset         String
  payChain         String
  quotedAmount     Decimal
  rate             Decimal
  rateLockedUntil  DateTime
  rail             String
  railRef          String?
  state            String
  refundAddress    String?
  events           PaymentEvent[]
  createdAt        DateTime @default(now())
  expiresAt        DateTime
}

model PaymentEvent {
  id         String   @id @default(cuid())
  invoiceId  String
  rail       String
  type       String
  txHash     String?
  leg        String?  // deposit | payout
  amount     Decimal?
  asset      String?
  chain      String?
  rawPayload Json
  ts         DateTime @default(now())
}

model LedgerEntry {   // record-of-truth even though funds are non-custodial
  id         String   @id @default(cuid())
  invoiceId  String
  kind       String   // fee | payout | refund
  amount     Decimal
  asset      String
  ts         DateTime @default(now())
}
```

All monetary math in **integer base units** or `Decimal` — never JS floats.

---

## 14. Compliance & regulatory (decide before live volume)

- Non-custodial-via-provider (v1) is lighter than full custody — but Simbi still **orchestrates conversion**, which may still trip VASP classification.
- Nigeria applies **functional jurisdiction** (like MiCA/VARA/FCA): rules attach to who you serve and where you operate, not where you incorporate. Operating from Nigeria / serving Nigerians = SEC Nigeria + ISA 2025 reach regardless of an offshore entity. Custody is its own licensed category (DAC).
- **[DECISION / EXTERNAL]** Engage a Nigerian fintech/securities lawyer to map the exact activity (non-custodial swap orchestration vs custodian) to the VASP perimeter **before** live third-party volume. *(Not legal advice; verify current SEC Nigeria / CBN posture with counsel.)*

---

## 15. Monetization — admin-configurable `FeePolicy`

All three fee mechanisms are **built, and each is independently toggleable from the admin app.** The admin can run one, two, or all three at once; none is hard-wired. A `FeePolicy` record (global default + optional per-merchant override) drives fee computation at invoice time.

| Mechanism | Where it applies | Admin control |
|-----------|------------------|---------------|
| **Provider fee-share** | v1 ChangeNOW (0.4% adjustable) + v2 RocketX default share | toggle on/off |
| **Quote markup** | transparent % added to the customer's quoted amount | toggle + set % |
| **Merchant SaaS fee** | flat recurring charge to the merchant | toggle + set amount |

**Deprecation-notice surface (your "if one must go" requirement):** each mechanism carries a `status` of `active | deprecating | disabled`. When a mechanism is marked `deprecating` (e.g. a provider ends fee-share, or a jurisdiction forces a markup change), the admin app shows a **notice banner with the instruction and effective date** on the fee-config screen, and the mechanism keeps working until the admin disables it. So an operator always sees *why* a fee option is going away and what to do, rather than it silently breaking.

- **v2 (WalletConnectRail):** RocketX integrator fee-share is the clean on-chain revenue path, surfaced through the same `FeePolicy`.
- **Recurring:** platform fee per cycle deducted at pull time, toggled via the SaaS-fee / markup switches above.

---

## 16. Build order (capability-layered, not time-boxed)

1. **Monorepo + gate first.** Turborepo, pnpm workspaces, `packages/config` (tsconfig strict + biome), Husky/lint-staged, GitHub Actions CI, branch protection. Nothing merges without the gate.
2. **Core (backend):** auth (merchant + admin RBAC), merchants, settlement config, invoice model + state machine, `SettlementRail` interface, checkout shell, webhook core, ledger, `@simbi/types` + generated `@simbi/sdk`.
3. **`DirectTransferRail`** (Tatum notifications, amount-pool, cooldown, payment URIs) — proves the non-custodial baseline end-to-end.
4. **`SwapProviderRail`** + `SwapProvider` abstraction (one primary + one fallback), full status UX, refund/failure handling, minimum fallback. **← v1 ships here.**
5. **merchants app + admin app:** dashboards, compliance/reconciliation queues, provider/fee config, monitoring.
6. **Hardening:** provider quote-routing/failover, reconciliation cron, Sentry/OTel, Playwright checkout e2e.
7. **v2:** `WalletConnectRail` (one-time router swap) + `RecurringRail` (Solidity approve+pull contract or bought-in provider), viem/wagmi checkout.

---

## Decisions — resolved
- [x] **Checkout** → its own `apps/checkout` (separate public service).
- [x] **Repo** → single pnpm + Turborepo monorepo.
- [x] **v1 swap provider** → ChangeNOW (primary) + SimpleSwap (fallback); deposit-address, Tron-destination verified, min-amount queried per pair.
- [x] **Fee mechanism** → all three built, each admin-toggleable via `FeePolicy`, with a deprecation-notice surface (§15).
- [x] **xpub "pro mode"** → per-merchant setting in the merchant app (§10.1).
- [x] **v2 router** → RocketX (primary) + Rango (fallback); Tron-destination verified; default integrator fee-share (§11.1).
- [x] **Recurring** → admin-selected active auth model (default approve+pull) and admin-selected build-vs-buy engine, both behind `RecurringRail` (§11.2).
- [x] **Settlement engine** → BullMQ + persisted state machine. No Temporal.

## Still open
- [ ] **Legal:** VASP perimeter mapping with Nigerian counsel **before live volume** (external; blocking for go-live, not for build).
- [ ] Deployment: DigitalOcean App Platform vs Droplet + Compose (§1) — operational preference.
- [ ] Merge vs split the `backend:webhook` process role at launch (§1).
