import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isInternal } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Bell } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { markAllNotificationsRead } from "@/server/actions/notifications";

const CHANNEL_LABELS: Record<string, string> = {
  IN_APP: "Painel",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  WEBHOOK: "Webhook",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { request: { select: { id: true, employeeName: true } } },
  });

  await markAllNotificationsRead();

  const requestBaseUrl = isInternal(session.user.role) ? "/ops/requests" : "/app/requests";

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h2 className="text-lg font-semibold">Notificações</h2>
        <p className="text-sm text-muted-foreground">Avisos sobre suas solicitações, mais recentes primeiro.</p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="Nenhuma notificação ainda" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <Badge variant="outline">{CHANNEL_LABELS[n.channel] ?? n.channel}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.request?.employeeName && `${n.request.employeeName} · `}
                  {formatDateTime(n.createdAt)}
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
          })}
        </div>
      )}
    </div>
  );
}
