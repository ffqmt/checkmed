import { prisma } from "@/lib/prisma";
import { isInternal } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { NotificationPanel } from "./notification-panel";

const NOTIFICATION_WINDOW = 20;

export async function NotificationBell({ userId, role }: { userId: string; role: UserRole }) {
  const [unreadCount, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId, channel: "IN_APP", status: { not: "READ" } } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_WINDOW,
      include: { request: { select: { id: true, employeeName: true } } },
    }),
  ]);

  return (
    <NotificationPanel
      initialUnreadCount={unreadCount}
      notifications={notifications}
      requestBaseUrl={isInternal(role) ? "/ops/requests" : "/app/requests"}
    />
  );
}
