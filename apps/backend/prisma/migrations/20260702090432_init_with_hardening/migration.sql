-- CreateEnum
CREATE TYPE "KybStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvoiceState" AS ENUM ('DRAFT', 'AWAITING_PAYMENT', 'RECEIVED', 'CONVERTING', 'COMPLIANCE_HOLD', 'PAYOUT_SENT', 'PAID_CONFIRMED', 'UNDERPAID', 'OVERPAID', 'FAILED', 'REFUNDED', 'EXPIRED', 'COOLDOWN');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "business" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "MerchantStatus" NOT NULL DEFAULT 'PENDING',
    "kybStatus" "KybStatus" NOT NULL DEFAULT 'PENDING',
    "kybTier" INTEGER NOT NULL DEFAULT 0,
    "settlementAsset" TEXT NOT NULL DEFAULT 'USDT-TRC20',
    "settlementAddresses" JSONB NOT NULL,
    "xpub" TEXT,
    "xpubMode" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "feeOverride" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "displayCurrency" TEXT NOT NULL,
    "displayAmount" DECIMAL(36,18) NOT NULL,
    "payAsset" TEXT NOT NULL,
    "payChain" TEXT NOT NULL,
    "quotedAmount" DECIMAL(36,18) NOT NULL,
    "rate" DECIMAL(36,18) NOT NULL,
    "rateLockedUntil" TIMESTAMP(3) NOT NULL,
    "rail" TEXT NOT NULL,
    "railRef" TEXT,
    "state" "InvoiceState" NOT NULL DEFAULT 'DRAFT',
    "refundAddress" TEXT,
    "depositAddress" TEXT,
    "expectedAmount" DECIMAL(36,18),
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT,
    "fromAsset" TEXT NOT NULL,
    "toAsset" TEXT NOT NULL,
    "rate" DECIMAL(36,18) NOT NULL,
    "providerRef" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTransaction" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTxId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "depositTxHash" TEXT,
    "payoutTxHash" TEXT,
    "quotedOut" DECIMAL(36,18) NOT NULL,
    "deliveredOut" DECIMAL(36,18),
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedPayment" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "txHash" TEXT NOT NULL,
    "candidates" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmatchedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregate" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttempt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealthSnapshot" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "successRate" DECIMAL(8,4) NOT NULL,
    "freezeRate" DECIMAL(8,4) NOT NULL,
    "medianSettleMs" INTEGER NOT NULL,
    "quotedVsDelivered" DECIMAL(8,4) NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "rail" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "txHash" TEXT,
    "leg" TEXT,
    "amount" DECIMAL(36,18),
    "asset" TEXT,
    "chain" TEXT,
    "rawPayload" JSONB NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "asset" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmountReservation" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "amountBaseUnits" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cooldownUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmountReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TatumSubscription" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TatumSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePolicy" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "providerFeeStatus" TEXT NOT NULL DEFAULT 'active',
    "providerFeePercent" DECIMAL(8,4) NOT NULL DEFAULT 0.4,
    "quoteMarkupStatus" TEXT NOT NULL DEFAULT 'active',
    "quoteMarkupPercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "saasStatus" TEXT NOT NULL DEFAULT 'disabled',
    "saasAmountUsd" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "saasIntervalDays" INTEGER NOT NULL DEFAULT 30,
    "deprecationNotes" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringPolicy" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "authModel" TEXT NOT NULL DEFAULT 'APPROVE_AND_PULL',
    "engine" TEXT NOT NULL DEFAULT 'IN_HOUSE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "Invoice_merchantId_idx" ON "Invoice"("merchantId");

-- CreateIndex
CREATE INDEX "Invoice_state_idx" ON "Invoice"("state");

-- CreateIndex
CREATE INDEX "Invoice_depositAddress_payAsset_payChain_idx" ON "Invoice"("depositAddress", "payAsset", "payChain");

-- CreateIndex
CREATE INDEX "Quote_invoiceId_idx" ON "Quote"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderTransaction_providerTxId_key" ON "ProviderTransaction"("providerTxId");

-- CreateIndex
CREATE INDEX "ProviderTransaction_invoiceId_idx" ON "ProviderTransaction"("invoiceId");

-- CreateIndex
CREATE INDEX "ProviderTransaction_provider_status_idx" ON "ProviderTransaction"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UnmatchedPayment_txHash_key" ON "UnmatchedPayment"("txHash");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_status_idx" ON "UnmatchedPayment"("status");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_nextAttempt_idx" ON "OutboxEvent"("status", "nextAttempt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateId_idx" ON "OutboxEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "ProviderHealthSnapshot_provider_createdAt_idx" ON "ProviderHealthSnapshot"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_invoiceId_idx" ON "PaymentEvent"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentEvent_txHash_idx" ON "PaymentEvent"("txHash");

-- CreateIndex
CREATE INDEX "LedgerEntry_invoiceId_idx" ON "LedgerEntry"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "AmountReservation_invoiceId_key" ON "AmountReservation"("invoiceId");

-- CreateIndex
CREATE INDEX "AmountReservation_address_asset_chain_idx" ON "AmountReservation"("address", "asset", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "TatumSubscription_subscriptionId_key" ON "TatumSubscription"("subscriptionId");

-- CreateIndex
CREATE INDEX "TatumSubscription_address_chain_idx" ON "TatumSubscription"("address", "chain");

-- CreateIndex
CREATE INDEX "WebhookDelivery_merchantId_idx" ON "WebhookDelivery"("merchantId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_invoiceId_idx" ON "WebhookDelivery"("invoiceId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_idx" ON "WebhookDelivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
