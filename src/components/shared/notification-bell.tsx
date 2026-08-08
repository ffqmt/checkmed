import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export async function NotificationBell({ userId }: { userId: string }) {
  const unreadCount = await prisma.notification.count({
    where: { userId, channel: "IN_APP", status: { not: "READ" } },
  });

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/notifications" aria-label="Notificações">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
