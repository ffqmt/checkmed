"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleOrganizationUserStatus } from "@/server/actions/users";
import type { UserStatus } from "@prisma/client";

export function UserStatusToggle({ userId, status }: { userId: string; status: UserStatus }) {
  const router = useRouter();

  async function handleClick() {
    await toggleOrganizationUserStatus(userId);
    toast.success("Status do usuário atualizado.");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {status === "ACTIVE" ? "Bloquear" : "Reativar"}
    </Button>
  );
}
