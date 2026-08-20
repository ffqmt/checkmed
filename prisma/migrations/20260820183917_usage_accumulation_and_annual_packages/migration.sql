-- Hand-edited: Prisma's diff defaulted to DROP+ADD, which would have
-- discarded every existing usage_records timestamp. This is a straight
-- rename instead — same column, same data, new name.
-- DropIndex
DROP INDEX "usage_records_organizationId_billedAt_idx";

-- AlterTable (rename, not drop+add — preserves existing data)
ALTER TABLE "usage_records" RENAME COLUMN "billedAt" TO "occurredAt";
ALTER TABLE "usage_records" ADD COLUMN     "invoiceId" TEXT;

-- CreateTable
CREATE TABLE "annual_packages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "totalValueCents" INTEGER NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "billingType" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "asaasInstallmentId" TEXT,
    "invoiceUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "annual_packages_asaasPaymentId_key" ON "annual_packages"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "annual_packages_organizationId_idx" ON "annual_packages"("organizationId");

-- CreateIndex
CREATE INDEX "usage_records_organizationId_occurredAt_idx" ON "usage_records"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "usage_records_invoiceId_idx" ON "usage_records"("invoiceId");

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_packages" ADD CONSTRAINT "annual_packages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
