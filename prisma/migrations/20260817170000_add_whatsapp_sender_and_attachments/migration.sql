-- AlterTable
ALTER TABLE "whatsapp_messages"
  ADD COLUMN "sentByUserId" TEXT,
  ADD COLUMN "attachmentStorageBucket" TEXT,
  ADD COLUMN "attachmentStoragePath" TEXT,
  ADD COLUMN "attachmentMimeType" TEXT,
  ADD COLUMN "attachmentFileName" TEXT,
  ADD COLUMN "attachmentFileSize" INTEGER;

-- AddForeignKey
ALTER TABLE "whatsapp_messages"
  ADD CONSTRAINT "whatsapp_messages_sentByUserId_fkey"
  FOREIGN KEY ("sentByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
