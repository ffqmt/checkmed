import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleBadge } from "@/components/shared/user-role-badge";
import { Badge } from "@/components/ui/badge";
import { initials, formatDateTime } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { permissions } from "@/lib/rbac";
import { CreateUserDialog } from "./create-user-dialog";
import { UserStatusToggle } from "./user-status-toggle";

export default async function ClientUsersPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId!;
  const canManage = permissions.manageOrganizationUsers(session!.user.role);

  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Usuários da empresa</h2>
          <p className="text-sm text-muted-foreground">Gerencie quem pode enviar e acompanhar solicitações.</p>
        </div>
        {canManage && <CreateUserDialog />}
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-secondary text-secondary-foreground">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserRoleBadge role={u.role} />
                <Badge variant={u.status === "ACTIVE" ? "success" : "neutral"}>{u.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  Último acesso: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "nunca"}
                </span>
                {canManage && u.id !== session!.user.id && <UserStatusToggle userId={u.id} status={u.status} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
