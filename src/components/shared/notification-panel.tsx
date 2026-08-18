"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { formatRelativeToNow } from "@/lib/utils";
import { markAllNotificationsRead } from "@/server/actions/notifications";

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "Painel",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  WEBHOOK: "Webhook",
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  channel: string;
  createdAt: Date;
  requestId: string | null;
  request: { id: string; employeeName: string } | null;
};

export function NotificationPanel({
  initialUnreadCount,
  notifications,
  requestBaseUrl,
}: {
  initialUnreadCount: number;
  notifications: NotificationItem[];
  requestBaseUrl: string;
}) {
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);

  async function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      setUnreadCount(0);
      await markAllNotificationsRead();
    }
  }

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-status-danger text-[10px] font-medium text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          ) : (
            notifications.map((n) => {
              const content = (
                <div className="border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className="shrink-0">
                      {CHANNEL_LABELS[n.channel] ?? n.channel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {n.request?.employeeName && `${n.request.employeeName} · `}
                    {formatRelativeToNow(n.createdAt)}
                  </p>
                </div>
              );
              return n.requestId ? (
                <Link key={n.id} href={`${requestBaseUrl}/${n.requestId}`} className="block">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
