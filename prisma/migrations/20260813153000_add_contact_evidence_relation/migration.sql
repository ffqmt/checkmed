-- CreateIndex
CREATE UNIQUE INDEX "contact_attempts_evidenceFileId_key" ON "contact_attempts"("evidenceFileId");

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_evidenceFileId_fkey" FOREIGN KEY ("evidenceFileId") REFERENCES "document_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
