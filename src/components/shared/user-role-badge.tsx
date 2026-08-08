import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

const ROLE_VARIANT: Record<UserRole, "default" | "secondary" | "outline"> = {
  SUPER_ADMIN: "default",
  INTERNAL_ADMIN: "default",
  INTERNAL_SUPERVISOR: "secondary",
  INTERNAL_ANALYST: "secondary",
  CLIENT_ADMIN: "outline",
  CLIENT_USER: "outline",
};

export function UserRoleBadge({ role }: { role: UserRole }) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABELS[role]}</Badge>;
}
