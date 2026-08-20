"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveDispute } from "@/server/actions/disputes";
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS, DISPUTE_STATUS_TONE } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { DisputeStatus } from "@prisma/client";

const RESOLVABLE_STATUSES: DisputeStatus[] = ["IN_REVIEW", "WAITING_ADDITIONAL_INFORMATION", "RESOLVED", "REJECTED", "CANCELLED"];

export function DisputePanel({
  dispute,
  canResolve,
}: {
  dispute: {
    id: string;
    reason: string;
    description: string;
    status: DisputeStatus;
    resolution: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
    openedBy: { name: string };
    assignedTo: { name: string } | null;
  };
  canResolve: boolean;
}) {
  const [status, setStatus] = React.useState<DisputeStatus>(dispute.status === "OPEN" ? "IN_REVIEW" : dispute.status);
  const [resolution, setResolution] = React.useState(dispute.resolution ?? "");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();
  const isClosed = ["RESOLVED", "REJECTED", "CANCELLED"].includes(dispute.status);

  async function handleResolve() {
    setPending(true);
    const result = await resolveDispute({ disputeId: dispute.id, status, resolution: resolution || undefined });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Contestação atualizada.");
    router.refresh();
  }

  return (
    <Card className="border-status-warning/40">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="size-4 text-status-warning" /> Contestação aberta pelo cliente
          </CardTitle>
          <Badge variant={DISPUTE_STATUS_TONE[dispute.status]}>{DISPUTE_STATUS_LABELS[dispute.status]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground">Motivo</p>
          <p className="font-medium">{DISPUTE_REASON_LABELS[dispute.reason] ?? dispute.reason}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Descrição do cliente</p>
          <p>{dispute.description}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Aberta por {dispute.openedBy.name} em {formatDateTime(dispute.createdAt)}
          {dispute.assignedTo && ` · Atribuída a ${dispute.assignedTo.name}`}
        </p>

        {dispute.resolution && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Resolução registrada</p>
            <p>{dispute.resolution}</p>
            {dispute.resolvedAt && <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(dispute.resolvedAt)}</p>}
          </div>
        )}

        {canResolve && !isClosed && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label>Novo status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DisputeStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLVABLE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {DISPUTE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resolução (visível ao cliente)</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                placeholder="Explique o que foi verificado e a conclusão — o cliente vai ler exatamente isso."
              />
            </div>
            <Button size="sm" onClick={handleResolve} disabled={pending}>
              Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
