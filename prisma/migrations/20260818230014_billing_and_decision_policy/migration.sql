-- CreateEnum
CREATE TYPE "BillingPlanTier" AS ENUM ('STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'CANCELED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "asaasCustomerId" TEXT,
ADD COLUMN     "billingBaseFeeCents" INTEGER,
ADD COLUMN     "billingPerUnitCents" INTEGER,
ADD COLUMN     "billingPlanTier" "BillingPlanTier";

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "asaasSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "billingType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "asaasPaymentId" TEXT,
    "referenceMonth" TIMESTAMP(3) NOT NULL,
    "baseFeeCents" INTEGER NOT NULL,
    "usageUnits" INTEGER NOT NULL,
    "usageCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "invoiceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "billedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_decision_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "autoValidateMinScore" INTEGER NOT NULL DEFAULT 85,
    "humanReviewMinScore" INTEGER NOT NULL DEFAULT 60,
    "clinicContactMaxScore" INTEGER NOT NULL DEFAULT 60,
    "supervisorReviewMaxScore" INTEGER NOT NULL DEFAULT 35,
    "requireDoctorValidatedForAutoValidate" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "organization_decision_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_asaasSubscriptionId_key" ON "subscriptions"("asaasSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_asaasPaymentId_key" ON "invoices"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organizationId_referenceMonth_key" ON "invoices"("organizationId", "referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_requestId_key" ON "usage_records"("requestId");

-- CreateIndex
CREATE INDEX "usage_records_organizationId_billedAt_idx" ON "usage_records"("organizationId", "billedAt");

-- CreateIndex
CREATE UNIQUE INDEX "organization_decision_policies_organizationId_key" ON "organization_decision_policies"("organizationId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_decision_policies" ADD CONSTRAINT "organization_decision_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
