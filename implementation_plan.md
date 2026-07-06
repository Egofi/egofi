# World-Class Hardening — Egofi Payment Gateway

After a full codebase audit as a senior solutions architect, here are the **critical gaps** preventing this from being a truly world-class product. Item 1 (RLS) was identified by you; items 2–7 are what I found.

---

## Executive Summary of Findings

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | **No PostgreSQL Row-Level Security** | 🔴 Critical | Data Isolation |
| 2 | **IDOR on `GET /invoices/:id`** — any merchant can read any invoice | 🔴 Critical | Authorization |
| 3 | **Flat rate limiting** — 100 req/min globally, no per-endpoint tuning | 🟡 High | Abuse Prevention |
| 4 | **Webhook secrets stored in cleartext** | 🟡 High | Data Protection |
| 5 | **No admin audit log** — approve/suspend/fee changes are untracked | 🟡 High | Compliance |
| 6 | **No JWT refresh token rotation** — tokens last 7 days with no revocation | 🟡 High | Auth Security |
| 7 | **No application-level tenant scoping middleware** — every query manually filters by `merchantId` | 🟠 Medium | Defense-in-Depth |

---

## Proposed Changes

### 1. PostgreSQL Row-Level Security (RLS)

**Why:** RLS is the database-level safety net that ensures a bug in any service layer can never leak Merchant A's data to Merchant B. It's the gold standard for multi-tenant SaaS — Stripe, Supabase, and every serious payment platform uses it.

**Approach:** Create a new Prisma migration with raw SQL that:
- Creates an `app_user` role with restricted permissions
- Enables RLS on all merchant-scoped tables (`Invoice`, `PaymentEvent`, `LedgerEntry`, `ApiKey`, `KybDocument`, `WebhookDelivery`, `AmountReservation`, `Quote`, `ProviderTransaction`)
- Creates policies that filter rows by `merchantId` matching `current_setting('app.current_merchant_id')`
- Modifies the `PrismaService` to set this session variable using `$executeRawUnsafe` before each request via middleware

#### [NEW] `prisma/migrations/YYYYMMDD_row_level_security/migration.sql`
Raw SQL migration enabling RLS on all merchant-scoped tables with policies tied to `app.current_merchant_id` session variable.

#### [MODIFY] [prisma.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/core/prisma.service.ts)
Add Prisma middleware that sets `SET LOCAL app.current_merchant_id = ?` at the start of each query, sourced from an AsyncLocalStorage context.

#### [NEW] `src/core/merchant-context.ts`
AsyncLocalStorage-based request-scoped store for the current merchant ID, populated by auth guards.

---

### 2. IDOR Fix — Merchant-Scoped Invoice Access

**Why:** The `GET /invoices/:id` endpoint calls `invoices.get(id)` without checking that the invoice belongs to the authenticated merchant. Any authenticated merchant can read any other merchant's invoice data (amounts, addresses, state). This is a **P0 security vulnerability** in a payment system.

#### [MODIFY] [invoices.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/invoices/invoices.controller.ts)
Pass `merchant.id` to `invoices.get()` and enforce ownership check.

#### [MODIFY] [invoices.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/invoices/invoices.service.ts)
- Add `merchantId` parameter to `get()` and `findOrThrow()`
- Throw `NotFoundException` (not `ForbiddenException` — don't leak existence) when the invoice doesn't belong to the merchant

---

### 3. Per-Endpoint Rate Limiting

**Why:** The current flat `100 req/min` throttle is applied globally. This means:
- The **public checkout** endpoint shares its budget with authenticated merchant endpoints
- The **webhook ingest** endpoint (critical for payment detection) can be starved by dashboard traffic
- There's no **login brute-force protection** — an attacker can try 100 passwords/minute

#### [MODIFY] [app.module.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/app.module.ts)
Configure named throttler groups with different limits.

#### [MODIFY] [auth.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/auth/auth.controller.ts)
Apply strict `@Throttle({ login: { ttl: 60_000, limit: 5 } })` to login/register endpoints (5 attempts per minute per IP).

#### [MODIFY] [checkout.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/checkout/checkout.controller.ts)
Apply `@Throttle({ public: { ttl: 60_000, limit: 30 } })` — more restrictive since it's public.

#### [MODIFY] [webhooks.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/webhooks/webhooks.controller.ts)
Apply `@SkipThrottle()` — webhooks are HMAC-verified and must never be rate-limited (a dropped webhook = missed payment).

---

### 4. Webhook Secret Encryption at Rest

**Why:** The `webhookSecret` field in the `Merchant` model stores the HMAC signing key as cleartext in the database. If the DB is compromised, an attacker can forge webhook signatures to any merchant's endpoint. The schema comment says "encrypted at rest" but no encryption is implemented.

#### [NEW] `src/core/crypto.service.ts`
AES-256-GCM encryption/decryption service using a `FIELD_ENCRYPTION_KEY` env variable. Produces `iv:authTag:ciphertext` format.

#### [MODIFY] [merchants.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/merchants/merchants.service.ts)
Encrypt `webhookSecret` before storing, decrypt when reading for HMAC computation.

#### [MODIFY] [env.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/shared/env.ts)
Add `FIELD_ENCRYPTION_KEY` (32-byte hex) to the Zod env schema.

---

### 5. Admin Audit Log

**Why:** The admin can approve/suspend merchants, change fee policies, and modify KYB decisions — but none of these actions are logged. In a regulated payment system, every admin action must have a trail for compliance reviews and incident investigation.

#### [NEW] Prisma schema addition — `AuditLog` model
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String   // admin user ID
  actorEmail String
  action     String   // e.g. "merchant.approve", "fee-policy.update"
  targetType String   // e.g. "merchant", "fee-policy"
  targetId   String
  before     Json?    // snapshot before change
  after      Json?    // snapshot after change
  ip         String?
  createdAt  DateTime @default(now())

  @@index([actorId])
  @@index([targetType, targetId])
  @@index([createdAt])
}
```

#### [NEW] `src/core/audit.service.ts`
Service to record audit entries, injected into admin-api and kyb-admin controllers.

#### [MODIFY] [admin-api.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/admin-api/admin-api.service.ts)
Wrap `approveMerchant`, `suspendMerchant`, and `updateFeePolicy` with audit log entries capturing before/after state and the acting admin's identity.

#### [MODIFY] [admin-api.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/admin-api/admin-api.controller.ts)
Extract admin user from JWT and pass to service methods for audit context.

---

### 6. JWT Refresh Token Rotation

**Why:** Current JWTs are valid for 7 days with no revocation mechanism. If a token leaks, an attacker has a week-long window. World-class auth uses short-lived access tokens (15 min) + refresh tokens (7 days) stored in the DB, with rotation on each refresh (old refresh token is invalidated).

#### [NEW] Prisma schema addition — `RefreshToken` model
```prisma
model RefreshToken {
  id           String   @id @default(cuid())
  merchantId   String
  tokenHash    String   @unique
  family       String   // rotation family for reuse detection
  expiresAt    DateTime
  revokedAt    DateTime?
  createdAt    DateTime @default(now())
  merchant     Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)

  @@index([merchantId])
  @@index([family])
}
```

#### [MODIFY] [auth.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/auth/auth.service.ts)
- Issue short-lived access tokens (15 min) + refresh tokens (7 days)
- Add `refreshToken()` method with rotation (invalidate old, issue new pair)
- Add refresh token family reuse detection (if a used refresh token is replayed, revoke the entire family — signals token theft)

#### [MODIFY] [auth.controller.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/auth/auth.controller.ts)
Add `POST /auth/refresh` endpoint.

---

### 7. Prisma Tenant-Scoping Middleware

**Why:** Currently, every query that touches merchant data must manually add `where: { merchantId }`. This is error-prone — one missed filter = data leak. A Prisma middleware can automatically inject `merchantId` into every query for merchant-scoped models as defense-in-depth (the application guard; RLS is the database guard).

#### [NEW] `src/core/tenant-scope.middleware.ts`
Prisma `$use()` middleware that reads the current merchant ID from AsyncLocalStorage and automatically injects `merchantId` filters into `findMany`, `findFirst`, `count`, `aggregate`, `groupBy` queries on tenant-scoped models. Admin context bypasses this.

#### [MODIFY] [prisma.service.ts](file:///c:/Users/EmmanuelEzechukwu/Downloads/Personal/egofi.io/apps/backend/src/core/prisma.service.ts)
Register the tenant-scoping middleware on init.

---

## Verification Plan

### Automated Tests
1. **RLS test**: Connect as the app user with merchant A's context, verify merchant B's invoices are invisible
2. **IDOR test**: Authenticate as merchant A, attempt `GET /invoices/{merchant-B-invoice-id}`, expect 404
3. **Rate limit test**: Send 6 login requests in 60s, verify the 6th gets 429
4. **Audit log test**: Call admin approve, verify AuditLog row exists with before/after snapshots
5. **Refresh token test**: Issue tokens, refresh, verify old refresh token is invalidated
6. **Encryption test**: Create merchant with webhook secret, verify DB column is not plaintext

### Manual Verification
- Inspect database rows to confirm webhook secrets are encrypted
- Query audit_log table after admin operations
- Verify Prometheus metrics still work after throttler changes

> [!IMPORTANT]
> **Items 1 (RLS) and 2 (IDOR) are P0 security issues** that should be deployed immediately. The IDOR vulnerability means any authenticated merchant can read any other merchant's invoice data right now. Items 3–7 are hardening improvements that elevate the product from "functional" to "world-class".

## Open Questions

> [!IMPORTANT]
> **RLS scope**: Should RLS policies also apply to the admin/worker roles, or should admin and background workers bypass RLS using a superuser role? (Recommended: bypass for admin and workers, enforce for the API role only.)

> [!NOTE]
> **Refresh token storage**: Should refresh tokens be stored in the database (Prisma) or in Redis? DB is more durable and survives Redis flushes; Redis is faster for high-frequency refresh. (Recommended: DB, since refresh happens infrequently.)
