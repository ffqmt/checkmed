"use client";

import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateLeadStatus } from "@/server/actions/leads";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  QUALIFIED: "Qualificado",
  CLOSED: "Encerrado",
};

export function LeadStatusSelect({ leadId, status }: { leadId: string; status: string }) {
  async function handleChange(next: string) {
    const result = await updateLeadStatus({ leadId, status: next });
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Status atualizado.");
  }

  return (
    <Select defaultValue={status} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
