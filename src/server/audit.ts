import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type AuditParams = {
  organizationId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousData?: Prisma.InputJsonValue | null;
  newData?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Every sensitive action funnels through here — see spec section 24 for the full list of audited actions. */
export async function recordAuditLog(params: AuditParams) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId ?? undefined,
      userId: params.userId ?? undefined,
      requestId: params.requestId ?? undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? undefined,
      previousDataJson: params.previousData ?? undefined,
      newDataJson: params.newData ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
      userAgent: params.userAgent ?? undefined,
    },
  });
}
