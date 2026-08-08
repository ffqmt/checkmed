"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleAnyUserStatus } from "@/server/actions/users";
import type { UserStatus } from "@prisma/client";

export function UserStatusToggleAdmin({ userId, status }: { userId: string; status: UserStatus }) {
  const router = useRouter();

  async function handleClick() {
    await toggleAnyUserStatus(userId);
    toast.success("Status atualizado.");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      {status === "ACTIVE" ? "Bloquear" : "Reativar"}
    </Button>
  );
}
