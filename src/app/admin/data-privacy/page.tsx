import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldQuestion } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { DATA_PRIVACY_REQUEST_TYPE_LABELS, DATA_PRIVACY_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { DataPrivacyActions } from "./data-privacy-actions";

const STATUS_VARIANT: Record<string, "success" | "neutral" | "warning" | "danger"> = {
  PENDING: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
};

export default async function AdminDataPrivacyPage() {
  const requests = await prisma.dataPrivacyRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { organization: { select: { name: true } }, requestedBy: { select: { name: true } } },
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Solicitações de privacidade (LGPD)</h2>
        <p className="text-sm text-muted-foreground">
          {pendingCount > 0 ? `${pendingCount} solicitação(ões) aguardando ação.` : "Nenhuma solicitação pendente."} Exclusão e
          anonimização são executadas automaticamente (localiza pelo nome + documento informados); acesso, correção e
          portabilidade são conduzidos manualmente.
        </p>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon={ShieldQuestion} title="Nenhuma solicitação registrada" />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {DATA_PRIVACY_REQUEST_TYPE_LABELS[r.requestType]} — {r.subjectName}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.organization.name} · {r.subjectDocumentMasked} · Solicitado por {r.requestedBy.name} em{" "}
                    {formatDateTime(r.createdAt)}
                  </p>
                  {r.notes && <p className="mt-2 text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{DATA_PRIVACY_REQUEST_STATUS_LABELS[r.status]}</Badge>
              </CardHeader>
              <CardContent>
                <DataPrivacyActions id={r.id} requestType={r.requestType} status={r.status} subjectName={r.subjectName} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
