import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { RiskBadge } from "@/components/shared/risk-badge";
import { ScoreIndicator } from "@/components/shared/score-indicator";
import { StepperWorkflow } from "@/components/shared/stepper-workflow";
import { Timeline } from "@/components/shared/timeline";
import { SlaIndicator } from "@/components/shared/sla-indicator";
import { EmptyState } from "@/components/shared/empty-state";
import { DocumentViewer } from "@/components/shared/document-viewer";
import { FileText } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { FINAL_RESULT_LABELS, ALERT_SEVERITY_LABELS } from "@/lib/constants";
import { DisputeButton } from "./dispute-button";

export default async function ClientRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const request = await prisma.medicalCertificateRequest.findUnique({
    where: { id },
    include: {
      timelineEvents: { where: { isClientVisible: true }, orderBy: { createdAt: "asc" }, include: { user: true } },
      finalReport: true,
      disputes: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      riskAnalysis: { include: { alerts: { where: { isClientVisible: true }, orderBy: { severity: "desc" } } } },
    },
  });

  if (!request || request.organizationId !== session?.user.organizationId) notFound();

  const canDispute = request.completedAt !== null && request.disputes.every((d) => ["RESOLVED", "REJECTED", "CANCELLED"].includes(d.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Solicitação #{request.id.slice(-8).toUpperCase()}</p>
          <h2 className="text-lg font-semibold">{request.employeeName}</h2>
          <p className="text-sm text-muted-foreground">{request.employeeDocumentMasked}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} />
          {request.riskLevel && <RiskBadge level={request.riskLevel} />}
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <StepperWorkflow status={request.status} />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="document">Documento</TabsTrigger>
          <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
          <TabsTrigger value="report">Parecer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="flex items-center justify-center lg:col-span-1">
              <CardContent className="flex flex-col items-center gap-2 p-5">
                {request.confidenceScore !== null ? (
                  <ScoreIndicator score={request.confidenceScore} />
                ) : (
                  <p className="text-center text-sm text-muted-foreground">Análise automática em andamento</p>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">O que está acontecendo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {request.clientVisibleSummary ? (
                  <p>{request.clientVisibleSummary}</p>
                ) : (
                  <p className="text-muted-foreground">
                    A análise automática deste documento ainda está em andamento. Assim que for concluída, um resumo do que foi verificado aparece aqui.
                  </p>
                )}
                {canDispute && (
                  <div className="pt-2">
                    <DisputeButton requestId={request.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {request.riskAnalysis && request.riskAnalysis.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pontos de atenção identificados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {request.riskAnalysis.alerts.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-muted-foreground">{a.description}</p>
                    </div>
                    <Badge variant={a.severity === "CRITICAL" || a.severity === "HIGH" ? "danger" : a.severity === "MEDIUM" ? "warning" : "neutral"}>
                      {ALERT_SEVERITY_LABELS[a.severity]}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da solicitação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Recebido pela empresa em</p>
                <p className="font-medium">{formatDate(request.receivedByCompanyAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium">{formatDateTime(request.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">SLA</p>
                <SlaIndicator dueAt={request.slaDueAt} completedAt={request.completedAt} />
              </div>
              <div>
                <p className="text-muted-foreground">Documentos enviados</p>
                <p className="font-medium">{request.documents.length}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document">
          {request.documents[0] ? (
            <DocumentViewer file={request.documents[0]} />
          ) : (
            <EmptyState icon={FileText} title="Nenhum documento anexado" />
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-5">
              <Timeline
                items={request.timelineEvents.map((e) => ({
                  id: e.id,
                  title: e.title,
                  description: e.description,
                  createdAt: e.createdAt,
                  isClientVisible: e.isClientVisible,
                  userName: e.user?.name,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          {request.finalReport ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{FINAL_RESULT_LABELS[request.finalReport.result]}</CardTitle>
                  <RiskBadge level={request.finalReport.riskLevel} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>{request.finalReport.executiveSummary}</p>
                {request.finalReport.clientVisibleNotes && (
                  <div className="rounded-lg bg-muted/50 p-3">{request.finalReport.clientVisibleNotes}</div>
                )}
                {request.finalReport.limitations && (
                  <div>
                    <p className="font-medium">Limitações</p>
                    <p className="text-muted-foreground">{request.finalReport.limitations}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Emitido em {formatDateTime(request.finalReport.generatedAt)}</p>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={FileText} title="Parecer ainda não disponível" description="O parecer final será exibido aqui assim que a análise for concluída." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
