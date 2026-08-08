-- AlterTable
ALTER TABLE "technical_analyses" ADD COLUMN     "externalProviderName" TEXT,
ADD COLUMN     "externalProviderResponseJson" JSONB;
