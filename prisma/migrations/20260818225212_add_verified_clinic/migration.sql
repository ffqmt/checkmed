-- CreateTable
CREATE TABLE "verified_clinics" (
    "id" TEXT NOT NULL,
    "cnesCode" TEXT NOT NULL,
    "cnpj" TEXT,
    "legalName" TEXT,
    "tradeName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ibgeCityCode" TEXT,
    "uf" TEXT,
    "operationalStatus" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verified_clinics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verified_clinics_cnesCode_key" ON "verified_clinics"("cnesCode");

-- CreateIndex
CREATE INDEX "verified_clinics_cnpj_idx" ON "verified_clinics"("cnpj");
