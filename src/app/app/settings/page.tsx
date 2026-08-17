import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldQuestion } from "lucide-react";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { WhatsAppNumberForm } from "./whatsapp-number-form";
import { DataPrivacyRequestForm } from "./data-privacy-request-form";
import { formatDateTime } from "@/lib/utils";
import { DATA_PRIVACY_REQUEST_TYPE_LABELS, DATA_PRIVACY_REQUEST_STATUS_LABELS } from "@/lib/constants";

const STATUS_VARIANT: Record<string, "success" | "neutral" | "warning" | "danger"> = {
  PENDING: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  REJECTED: "danger",
};

export default async function ClientSettingsPage() {
  const session = await auth();

  const [preference, privacyRequests, me] = await Promise.all([
    prisma.notificationPreference.findFirst({
      where: { organizationId: session!.user.organizationId!, userId: session!.user.id },
    }),
    prisma.dataPrivacyRequest.findMany({
      where: { organizationId: session!.user.organizationId! },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // phone isn't in the JWT session — fetched fresh so it reflects an edit from this same page without needing to log back in.
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { phone: true } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie suas preferências de notificação e dados.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificações</CardTitle>
          <CardDescription>Escolha em quais momentos você quer ser notificado sobre suas solicitações.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WhatsAppNumberForm defaultPhone={me?.phone ?? null} />
          <NotificationPreferencesForm
            hasPhone={Boolean(me?.phone)}
            userEmail={session!.user.email!}
            defaultValues={{
              notifyOnRequestReceived: preference?.notifyOnRequestReceived ?? true,
              notifyOnProcessingStarted: preference?.notifyOnProcessingStarted ?? true,
              notifyOnWaitingExternalResponse: preference?.notifyOnWaitingExternalResponse ?? true,
              notifyOnCompleted: preference?.notifyOnCompleted ?? true,
              notifyOnInconsistency: preference?.notifyOnInconsistency ?? true,
              notifyViaWhatsApp: preference?.notifyViaWhatsApp ?? true,
              notifyViaEmail: preference?.notifyViaEmail ?? true,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Privacidade e dados (LGPD)</CardTitle>
            <CardDescription>Solicite acesso, correção, exclusão, anonimização ou portabilidade de dados de um titular.</CardDescription>
          </div>
          <DataPrivacyRequestForm />
        </CardHeader>
        <CardContent className="space-y-2">
          {privacyRequests.length === 0 ? (
            <EmptyState icon={ShieldQuestion} title="Nenhuma solicitação registrada" />
          ) : (
            privacyRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {DATA_PRIVACY_REQUEST_TYPE_LABELS[r.requestType]} — {r.subjectName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.subjectDocumentMasked} · Registrada em {formatDateTime(r.createdAt)}
                    {r.completedAt && ` · Concluída em ${formatDateTime(r.completedAt)}`}
                  </p>
                  {r.notes && <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p>}
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{DATA_PRIVACY_REQUEST_STATUS_LABELS[r.status]}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
