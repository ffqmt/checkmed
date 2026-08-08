import { prisma } from "@/lib/prisma";
import type { Prisma, TimelineEventType } from "@prisma/client";

type TimelineParams = {
  requestId: string;
  userId?: string | null;
  eventType: TimelineEventType;
  title: string;
  description?: string;
  isClientVisible?: boolean;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Appends one event to the request's timeline — the auditable chain of
 * custody surfaced in both the internal case view and (for
 * isClientVisible events) the client-facing tracking screen.
 */
export async function recordTimelineEvent(params: TimelineParams) {
  await prisma.requestTimelineEvent.create({
    data: {
      requestId: params.requestId,
      userId: params.userId ?? undefined,
      eventType: params.eventType,
      title: params.title,
      description: params.description,
      isClientVisible: params.isClientVisible ?? false,
      metadataJson: params.metadata,
    },
  });
}
