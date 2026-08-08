import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { UserRoleBadge } from "@/components/shared/user-role-badge";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatDateTime } from "@/lib/utils";
import { CreateInternalUserDialog } from "./create-internal-user-dialog";
import { UserStatusToggleAdmin } from "./user-status-toggle-admin";

export default async function AdminUsersPage() {
  const [users, organizations] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" }, include: { organization: true } }),
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">Todos os usuários internos e de organizações clientes.</p>
        </div>
        <CreateInternalUserDialog organizations={organizations.map((o) => ({ id: o.id, name: o.name }))} />
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
                  <p className="text-xs text-muted-foreground">{u.email} {u.organization ? `· ${u.organization.name}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <UserRoleBadge role={u.role} />
                <Badge variant={u.status === "ACTIVE" ? "success" : "neutral"}>{u.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "nunca acessou"}
                </span>
                <UserStatusToggleAdmin userId={u.id} status={u.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
