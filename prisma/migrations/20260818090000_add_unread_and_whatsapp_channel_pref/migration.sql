-- Track when an analyst has viewed an inbound WhatsApp message's thread (never conflated with readAt, which is Meta's delivery-read-receipt on our OUTBOUND sends)
ALTER TABLE "whatsapp_messages" ADD COLUMN "seenByAnalystAt" TIMESTAMP(3);

-- Per-user WhatsApp channel toggle, independent from the existing per-event booleans; replaces the never-read channelsJson scaffold
ALTER TABLE "notification_preferences" ADD COLUMN "notifyViaWhatsApp" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "notification_preferences" DROP COLUMN "channelsJson";
