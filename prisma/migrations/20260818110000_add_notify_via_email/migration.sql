-- Per-user email channel toggle, same shape as notifyViaWhatsApp
ALTER TABLE "notification_preferences" ADD COLUMN "notifyViaEmail" BOOLEAN NOT NULL DEFAULT true;
