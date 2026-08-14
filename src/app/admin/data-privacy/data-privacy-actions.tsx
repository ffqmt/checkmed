"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Check, X, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fulfillDataPrivacyRequest, updateDataPrivacyRequestStatus, exportDataPrivacyRequestData } from "@/server/actions/data-privacy";
import type { DataPrivacyRequestStatus, DataPrivacyRequestType } from "@prisma/client";

export function DataPrivacyActions({
  id,
  requestType,
  status,
  subjectName,
}: {
  id: string;
  requestType: DataPrivacyRequestType;
  status: DataPrivacyRequestStatus;
  subjectName: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [notes, setNotes] = React.useState("");
  const router = useRouter();

  const canAutoFulfill = requestType === "ANONYMIZATION" || requestType === "DELETION";
  const canExport = requestType === "ACCESS" || requestType === "EXPORT";
  const isDone = status === "COMPLETED" || status === "REJECTED";

  async function handleFulfill() {
    if (!confirm(`Confirma executar ${requestType === "DELETION" ? "a exclusão" : "a anonimização"} dos dados de "${subjectName}"? Essa ação não pode ser desfeita.`)) {
      return;
    }
    setPending(true);
    try {
      const result = await fulfillDataPrivacyRequest(id);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Concluído — ${result.matchedRequests} solicitação(ões) processada(s).`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao executar.");
    } finally {
      setPending(false);
    }
  }

  async function handleExport() {
    setPending(true);
    try {
      const data = await exportDataPrivacyRequestData(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `dados-${subjectName.replace(/\s+/g, "-").toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Exportação gerada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar.");
    } finally {
      setPending(false);
    }
  }

  async function handleStatusChange(newStatus: "IN_PROGRESS" | "COMPLETED" | "REJECTED") {
    setPending(true);
    try {
      const result = await updateDataPrivacyRequestStatus({ id, status: newStatus, notes: notes || undefined });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Status atualizado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar.");
    } finally {
      setPending(false);
    }
  }

  if (isDone) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      {canAutoFulfill && (
        <Button size="sm" onClick={handleFulfill} disabled={pending}>
          <PlayCircle /> Executar automaticamente
        </Button>
      )}
      {canExport && (
        <Button size="sm" variant="outline" onClick={handleExport} disabled={pending}>
          <Download /> Exportar dados (JSON)
        </Button>
      )}
      <div className="flex flex-1 items-center gap-2">
        <Textarea
          placeholder="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="h-9 min-h-9 flex-1 py-2 text-xs"
        />
        <Button size="sm" variant="outline" onClick={() => handleStatusChange("IN_PROGRESS")} disabled={pending}>
          Em andamento
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusChange("COMPLETED")} disabled={pending}>
          <Check /> Concluir
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleStatusChange("REJECTED")} disabled={pending}>
          <X /> Rejeitar
        </Button>
      </div>
    </div>
  );
}
