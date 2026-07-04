-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodDuration" INTEGER NOT NULL DEFAULT 1,
    "periodUnit" TEXT NOT NULL DEFAULT 'MONTH',
    "costPerPeriod" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "ipnCallbackUrl" TEXT,
    "successUrl" TEXT,
    "failedUrl" TEXT,
    "partialUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionPlan_merchantId_idx" ON "SubscriptionPlan"("merchantId");

-- AddForeignKey
ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
