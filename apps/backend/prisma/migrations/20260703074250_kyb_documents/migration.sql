-- CreateEnum
CREATE TYPE "KybDocumentType" AS ENUM ('BUSINESS_REGISTRATION', 'TAX_ID', 'DIRECTOR_ID', 'PROOF_OF_ADDRESS', 'BANK_STATEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "KybDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "KybStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "kybReviewNote" TEXT,
ADD COLUMN     "kybSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KybDocument" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "type" "KybDocumentType" NOT NULL,
    "status" "KybDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "cloudinaryPublicId" TEXT NOT NULL,
    "cloudinaryResourceType" TEXT NOT NULL DEFAULT 'image',
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "reviewNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "KybDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KybDocument_merchantId_idx" ON "KybDocument"("merchantId");

-- CreateIndex
CREATE INDEX "KybDocument_status_idx" ON "KybDocument"("status");

-- AddForeignKey
ALTER TABLE "KybDocument" ADD CONSTRAINT "KybDocument_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
