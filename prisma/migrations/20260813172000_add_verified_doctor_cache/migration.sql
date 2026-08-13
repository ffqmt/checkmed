-- CreateTable
CREATE TABLE "verified_doctors" (
    "id" TEXT NOT NULL,
    "crm" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "officialName" TEXT NOT NULL,
    "registrationStatus" TEXT,
    "specialty" TEXT,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verified_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "verified_doctors_crm_uf_key" ON "verified_doctors"("crm", "uf");

-- AddForeignKey
ALTER TABLE "verified_doctors" ADD CONSTRAINT "verified_doctors_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
