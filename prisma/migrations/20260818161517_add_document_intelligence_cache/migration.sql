-- CreateTable
CREATE TABLE "document_intelligence_cache" (
    "sha256Hash" TEXT NOT NULL,
    "rawExtractionJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_intelligence_cache_pkey" PRIMARY KEY ("sha256Hash")
);
