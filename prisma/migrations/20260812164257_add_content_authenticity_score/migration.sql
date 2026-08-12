-- AlterEnum
ALTER TYPE "RiskAlertType" ADD VALUE 'CONTENT_AUTHENTICITY_CONCERN';

-- AlterTable
ALTER TABLE "technical_analyses" ADD COLUMN     "contentAuthenticityRiskScore" INTEGER;
