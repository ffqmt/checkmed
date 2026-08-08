"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationStatus } from "@/server/actions/organizations";
import type { OrganizationStatus } from "@prisma/client";

export function OrganizationStatusSelect({ organizationId, status }: { organizationId: string; status: OrganizationStatus }) {
  const router = useRouter();

  async function handleChange(value: string) {
    await updateOrganizationStatus(organizationId, value as OrganizationStatus);
    toast.success("Status atualizado.");
    router.refresh();
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TRIAL">Trial</SelectItem>
        <SelectItem value="ACTIVE">Ativa</SelectItem>
        <SelectItem value="INACTIVE">Inativa</SelectItem>
        <SelectItem value="SUSPENDED">Suspensa</SelectItem>
      </SelectContent>
    </Select>
  );
}
