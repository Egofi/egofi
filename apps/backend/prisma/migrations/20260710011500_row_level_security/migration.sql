-- Tenant isolation enforced by Postgres, not only by `where: { merchantId }`.
--
-- Two roles:
--   egofi      owner/migrator. Superuser, so it bypasses RLS — migrations and
--              seeds keep working exactly as before.
--   egofi_app  the runtime role. NOSUPERUSER + NOBYPASSRLS, so every policy
--              below actually applies to it. The application must connect as
--              this role or none of this does anything.
--
-- Inside an authenticated merchant request the app sets the transaction-local
-- GUC `app.current_merchant_id`. Public checkout, admin endpoints and
-- background jobs leave it unset and stay unrestricted, exactly as today.
-- So these policies do not defend against a compromised backend; they defend
-- against a merchant-facing query that forgets to filter on merchantId.

-- ── Runtime role ──────────────────────────────────────────────────────────
-- Created without LOGIN on purpose: the password is attached out of band so it
-- never lives in version control. See scripts/grant-app-role.sql.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'egofi_app') THEN
    CREATE ROLE egofi_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO egofi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO egofi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO egofi_app;

-- The runtime role has no business reading the migration ledger.
REVOKE ALL ON TABLE "_prisma_migrations" FROM egofi_app;

-- Tables created by later migrations (which run as the owner) inherit these.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO egofi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO egofi_app;

-- ── Current tenant ────────────────────────────────────────────────────────
-- `current_setting(_, true)` yields NULL when never set and '' once a previous
-- transaction on this pooled connection set and released it. Both mean
-- "no merchant context", hence the nullif.
CREATE OR REPLACE FUNCTION app_current_merchant_id() RETURNS text
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT nullif(current_setting('app.current_merchant_id', true), '')
$$;

-- An outbox row belongs to whichever tenant owns its aggregate.
CREATE OR REPLACE FUNCTION app_outbox_visible(p_aggregate text, p_aggregate_id text) RETURNS boolean
  LANGUAGE sql
  STABLE
  PARALLEL SAFE
AS $$
  SELECT app_current_merchant_id() IS NULL
      OR (p_aggregate = 'merchant' AND p_aggregate_id = app_current_merchant_id())
      OR (p_aggregate = 'invoice' AND EXISTS (
            SELECT 1 FROM "Invoice" i
            WHERE i."id" = p_aggregate_id AND i."merchantId" = app_current_merchant_id()))
      OR (p_aggregate = 'subscription' AND EXISTS (
            SELECT 1 FROM "Subscription" s
            WHERE s."id" = p_aggregate_id AND s."merchantId" = app_current_merchant_id()))
$$;

-- Re-runnable: drop any policy this migration owns before recreating it.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('tenant_isolation', 'internal_only', 'outbox_append',
                         'outbox_tenant_read', 'outbox_internal_update', 'outbox_internal_delete')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$$;

-- ── Tables keyed directly by merchantId ───────────────────────────────────
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ApiKey"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invoice"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "KybDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KybDocument" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "KybDocument"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "RefreshToken"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Subscription"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPlan" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SubscriptionPlan"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "TatumSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TatumSubscription" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "TatumSubscription"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WebhookDelivery"
  USING (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "merchantId" = app_current_merchant_id());

-- ── The tenant itself ─────────────────────────────────────────────────────
-- Login and registration run without a merchant context, so they still see
-- every row; once authenticated, a merchant sees only itself.
ALTER TABLE "Merchant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Merchant" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Merchant"
  USING (app_current_merchant_id() IS NULL OR "id" = app_current_merchant_id())
  WITH CHECK (app_current_merchant_id() IS NULL OR "id" = app_current_merchant_id());

-- ── Keyed indirectly, through the invoice ─────────────────────────────────
ALTER TABLE "PaymentEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PaymentEvent"
  USING (
    app_current_merchant_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i."id" = "PaymentEvent"."invoiceId"
        AND i."merchantId" = app_current_merchant_id()
    )
  )
  WITH CHECK (
    app_current_merchant_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM "Invoice" i
      WHERE i."id" = "PaymentEvent"."invoiceId"
        AND i."merchantId" = app_current_merchant_id()
    )
  );

-- ── Internal tables no merchant request may touch ─────────────────────────
-- Reached only by admin endpoints, public checkout and background workers, all
-- of which run without a merchant context. A merchant-scoped query that lands
-- here sees nothing, which is what we want: it means a bug, not a feature.
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "AdminUser"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "AmountReservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AmountReservation" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "AmountReservation"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "AuditLog"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "FeePolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeePolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "FeePolicy"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "LedgerEntry"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "ProviderHealthSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderHealthSnapshot" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "ProviderHealthSnapshot"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "ProviderTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderTransaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "ProviderTransaction"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "Quote"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "RecurringPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringPolicy" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "RecurringPolicy"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

ALTER TABLE "UnmatchedPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UnmatchedPayment" FORCE ROW LEVEL SECURITY;
CREATE POLICY internal_only ON "UnmatchedPayment"
  USING (app_current_merchant_id() IS NULL) WITH CHECK (app_current_merchant_id() IS NULL);

-- ── Outbox: scoped by the aggregate the event belongs to ──────────────────
-- A merchant action legitimately produces an outbox event (KYB submit does), so
-- INSERT has to be allowed. It cannot be "insert but never read": Prisma writes
-- `INSERT ... RETURNING`, and Postgres applies the SELECT policy to the returned
-- row, so a read-denying policy fails the insert. Scope reads by aggregate
-- instead — a merchant sees the events for its own aggregates and nothing else.
-- Only the dispatcher (no merchant context) may mark an event delivered.
ALTER TABLE "OutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY outbox_append ON "OutboxEvent"
  FOR INSERT WITH CHECK (app_outbox_visible(aggregate, "aggregateId"));
CREATE POLICY outbox_tenant_read ON "OutboxEvent"
  FOR SELECT USING (app_outbox_visible(aggregate, "aggregateId"));
CREATE POLICY outbox_internal_update ON "OutboxEvent"
  FOR UPDATE USING (app_current_merchant_id() IS NULL);
CREATE POLICY outbox_internal_delete ON "OutboxEvent"
  FOR DELETE USING (app_current_merchant_id() IS NULL);
