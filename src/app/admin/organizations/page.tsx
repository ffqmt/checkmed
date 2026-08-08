import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCnpj } from "@/lib/masking";
import { formatDate } from "@/lib/utils";
import { permissions } from "@/lib/rbac";
import { CreateOrganizationDialog } from "./create-organization-dialog";
import { OrganizationStatusSelect } from "./organization-status-select";

const STATUS_VARIANT: Record<string, "success" | "neutral" | "warning" | "danger"> = {
  ACTIVE: "success",
  TRIAL: "warning",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
};

export default async function AdminOrganizationsPage() {
  const session = await auth();
  const canCreate = permissions.manageOrganizations(session!.user.role);

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, requests: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Organizações</h2>
          <p className="text-sm text-muted-foreground">Empresas clientes assinantes da plataforma.</p>
        </div>
        {canCreate && <CreateOrganizationDialog />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCnpj(org.cnpj)}</p>
                </div>
                <Badge variant={STATUS_VARIANT[org.status]}>{org.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{org._count.users} usuários</span>
                <span>{org._count.requests} solicitações</span>
                <span>SLA: {org.slaHours}h</span>
                <span>Retenção: {org.dataRetentionDays}d</span>
              </div>
              <p className="text-xs text-muted-foreground">Desde {formatDate(org.createdAt)}</p>
              {canCreate && <OrganizationStatusSelect organizationId={org.id} status={org.status} />}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
