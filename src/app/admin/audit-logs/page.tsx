import { prisma } from "@/lib/prisma";
import { FilterBar } from "@/components/shared/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import { ScrollText } from "lucide-react";
import type { Prisma } from "@prisma/client";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const where: Prisma.AuditLogWhereInput = params.q ? { action: { contains: params.q, mode: "insensitive" } } : {};

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true, organization: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Logs de auditoria</h2>
        <p className="text-sm text-muted-foreground">Registro de ações sensíveis realizadas na plataforma.</p>
      </div>

      <FilterBar searchPlaceholder="Buscar por ação..." />

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum registro encontrado" />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3 text-sm last:border-0">
              <div>
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground">
                  {log.entityType} {log.entityId ? `· ${log.entityId.slice(-8)}` : ""} · {log.user?.name ?? "Sistema"}
                  {log.organization ? ` · ${log.organization.name}` : ""}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
