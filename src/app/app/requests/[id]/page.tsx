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
import { VerificationChecklist, type ChecklistItem } from "@/components/shared/verification-checklist";
import { Field } from "@/components/shared/field";
import { EvidenceFileLink } from "@/components/shared/evidence-file-link";
import { PrintReportButton } from "@/components/shared/print-report-button";
import { FinalReportPrintHeader } from "@/components/shared/final-report-print-header";
import { FileText, ScanSearch, Phone } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  FINAL_RESULT_LABELS,
  ALERT_SEVERITY_LABELS,
  CID_REDACTED_LABEL,
  CONTACT_TYPE_LABELS,
  CONTACT_RESULT_LABELS,
} from "@/lib/constants";
import { DisputeButton } from "./dispute-button";
import { buildVerificationChecklist } from "./checklist";

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
      extractedData: true,
      technicalAnalysis: true,
      clinicVerification: true,
      doctorVerification: true,
      qrCodeVerification: true,
      contactAttempts: { where: { isClientVisible: true }, include: { evidenceFile: true }, orderBy: { attemptedAt: "desc" } },
    },
  });

  if (!request || request.organizationId !== session?.user.organizationId) notFound();

  const canDispute = request.completedAt !== null && request.disputes.every((d) => ["RESOLVED", "REJECTED", "CANCELLED"].includes(d.status));

  const checklistItems = buildVerificationChecklist({
    extractedData: request.extractedData,
    technicalAnalysis: request.technicalAnalysis,
    clinicVerification: request.clinicVerification,
    doctorVerification: request.doctorVerification,
    qrCodeVerification: request.qrCodeVerification,
    riskAnalysisAlerts: request.riskAnalysis?.alerts ?? [],
  });

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
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <StepperWorkflow status={request.status} />
          <SlaIndicator dueAt={request.slaDueAt} completedAt={request.completedAt} showAbsoluteDate />
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="document">Documento</TabsTrigger>
          <TabsTrigger value="extracted">Dados extraídos</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo do atestado</CardTitle>
            </CardHeader>
            <CardContent>
              {request.extractedData ? (
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <Field label="Médico responsável" value={request.extractedData.doctorName} />
                  <Field label="Clínica/instituição" value={request.extractedData.clinicName} />
                  <Field label="Data de emissão" value={formatDate(request.extractedData.certificateIssueDate)} />
                  <Field label="Dias de afastamento" value={request.extractedData.absenceDays?.toString()} />
                  <Field
                    label="Período de afastamento"
                    value={`${formatDate(request.extractedData.absenceStartDate)} a ${formatDate(request.extractedData.absenceEndDate)}`}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  A leitura do documento ainda está em andamento — os dados extraídos aparecem aqui assim que concluída.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">O que foi verificado</CardTitle>
            </CardHeader>
            <CardContent>
              <VerificationChecklist items={checklistItems} />
            </CardContent>
          </Card>

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
            <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Recebido pela empresa em</p>
                <p className="font-medium">{formatDate(request.receivedByCompanyAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Criada em</p>
                <p className="font-medium">{formatDateTime(request.createdAt)}</p>
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

        <TabsContent value="extracted">
          {request.extractedData ? (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Médico" value={request.extractedData.doctorName} />
                <Field label="CRM" value={`${request.extractedData.doctorCrm ?? "—"} / ${request.extractedData.doctorCrmUf ?? "—"}`} />
                <Field label="Data de emissão" value={formatDate(request.extractedData.certificateIssueDate)} />
                <Field label="Dias de afastamento" value={request.extractedData.absenceDays?.toString()} />
                <Field
                  label="Período"
                  value={`${formatDate(request.extractedData.absenceStartDate)} a ${formatDate(request.extractedData.absenceEndDate)}`}
                />
                <Field label="CID" value={CID_REDACTED_LABEL} sensitive />
                <Field label="Clínica/Hospital" value={request.extractedData.clinicName} />
                <Field label="CNPJ" value={request.extractedData.clinicCnpj} />
                <Field label="CNES" value={request.extractedData.clinicCnes} />
                <Field label="Endereço" value={request.extractedData.clinicAddress} />
                <Field label="Telefone" value={request.extractedData.clinicPhone} />
                <Field label="E-mail" value={request.extractedData.clinicEmail} />
                <Field label="QR Code / link de autenticação" value={request.extractedData.authenticationUrl} />
                {Array.isArray(request.extractedData.extractionWarningsJson) && request.extractedData.extractionWarningsJson.length > 0 && (
                  <div className="col-span-2 rounded-lg bg-status-warning/10 p-3 text-sm text-status-warning">
                    {(request.extractedData.extractionWarningsJson as string[]).map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScanSearch} title="Extração ainda não concluída" />
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-2">
          {request.contactAttempts.length === 0 ? (
            <EmptyState icon={Phone} title="Nenhum contato registrado" description="Contatos com a clínica/hospital emissor aparecem aqui quando relevantes para o seu caso." />
          ) : (
            request.contactAttempts.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.contactTarget}</p>
                    <Badge variant="outline">{CONTACT_RESULT_LABELS[c.result]}</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {c.contactValue} · {CONTACT_TYPE_LABELS[c.contactType]}
                  </p>
                  {c.notes && <p className="mt-1">{c.notes}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(c.attemptedAt)}</p>
                  {c.evidenceFile && <EvidenceFileLink file={c.evidenceFile} />}
                </CardContent>
              </Card>
            ))
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
            <div id="printable-report">
              <FinalReportPrintHeader
                employeeName={request.employeeName}
                employeeDocumentMasked={request.employeeDocumentMasked}
                requestId={request.id}
                receivedByCompanyAt={request.receivedByCompanyAt}
              />
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{FINAL_RESULT_LABELS[request.finalReport.result]}</CardTitle>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={request.finalReport.riskLevel} />
                      <PrintReportButton />
                    </div>
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
            </div>
          ) : (
            <EmptyState icon={FileText} title="Parecer ainda não disponível" description="O parecer final será exibido aqui assim que a análise for concluída." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
