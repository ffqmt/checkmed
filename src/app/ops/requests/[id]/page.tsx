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
import { Field } from "@/components/shared/field";
import { EvidenceFileLink } from "@/components/shared/evidence-file-link";
import { ContactAttemptForm } from "@/components/requests/contact-attempt-form";
import { DisputePanel } from "@/components/requests/dispute-panel";
import { WhatsAppPanel } from "@/components/requests/whatsapp-panel";
import { getWhatsAppMessages } from "@/server/actions/whatsapp";
import { FinalReportForm } from "@/components/requests/final-report-form";
import { ApproveReportButton } from "@/components/requests/approve-report-button";
import { PrintReportButton } from "@/components/shared/print-report-button";
import { FinalReportPrintHeader } from "@/components/shared/final-report-print-header";
import { formatDate, formatDateTime } from "@/lib/utils";
import { VERIFICATION_STATUS_LABELS, QR_STATUS_LABELS, ALERT_SEVERITY_LABELS, FINAL_RESULT_LABELS, PRIORITY_LABELS, CID_REDACTED_LABEL } from "@/lib/constants";
import { permissions } from "@/lib/rbac";
import { FileText, Link2, ScanSearch, Fingerprint, Gauge, Phone, History, ScrollText } from "lucide-react";

export default async function OpsRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const request = await prisma.medicalCertificateRequest.findUnique({
    where: { id },
    include: {
      organization: true,
      submittedBy: true,
      assignedTo: true,
      supervisor: true,
      documents: { orderBy: { createdAt: "desc" } },
      extractedData: true,
      doctorVerification: true,
      clinicVerification: true,
      qrCodeVerification: true,
      technicalAnalysis: true,
      fingerprint: true,
      similarityMatches: { include: { matchedRequest: true } },
      riskAnalysis: { include: { alerts: true } },
      contactAttempts: { include: { responsibleUser: true, evidenceFile: true }, orderBy: { attemptedAt: "desc" } },
      disputes: { orderBy: { createdAt: "desc" }, include: { openedBy: true, assignedTo: true } },
      timelineEvents: { orderBy: { createdAt: "asc" }, include: { user: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 50, include: { user: true } },
      finalReport: true,
    },
  });

  if (!request) notFound();

  const canReview = permissions.reviewAsAnalyst(session!.user.role);
  const canApprove = permissions.approveSupervisorReview(session!.user.role);
  const primaryFile = request.documents[0];
  const whatsAppMessages = await getWhatsAppMessages(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            #{request.id.slice(-8).toUpperCase()} · {request.organization.name}
          </p>
          <h2 className="text-lg font-semibold">{request.employeeName}</h2>
          <p className="text-sm text-muted-foreground">{request.employeeDocumentMasked}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{PRIORITY_LABELS[request.priority]}</Badge>
          <StatusBadge status={request.status} />
          {request.riskLevel && <RiskBadge level={request.riskLevel} />}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <StepperWorkflow status={request.status} />
          <SlaIndicator dueAt={request.slaDueAt} completedAt={request.completedAt} />
        </CardContent>
      </Card>

      {request.disputes[0] && <DisputePanel dispute={request.disputes[0]} canResolve={canApprove} />}

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="document">Documento</TabsTrigger>
          <TabsTrigger value="extracted">Dados extraídos</TabsTrigger>
          <TabsTrigger value="doctor">Médico</TabsTrigger>
          <TabsTrigger value="clinic">Clínica</TabsTrigger>
          <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          <TabsTrigger value="technical">Análise técnica</TabsTrigger>
          <TabsTrigger value="similarity">Similaridade</TabsTrigger>
          <TabsTrigger value="risk">Score de risco</TabsTrigger>
          <TabsTrigger value="contacts">Contatos</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="report">Parecer</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {request.riskAnalysis ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="flex items-center justify-center lg:col-span-1">
                <CardContent className="p-5">
                  <ScoreIndicator score={request.riskAnalysis.score} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">O que encontramos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{request.riskAnalysis.summary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 font-medium text-status-success">Indicadores positivos</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {(request.riskAnalysis.positiveIndicatorsJson as string[] | null)?.map((p, i) => <li key={i}>{p}</li>)}
                        {((request.riskAnalysis.positiveIndicatorsJson as string[] | null)?.length ?? 0) === 0 && (
                          <li className="list-none">Nenhum</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-status-danger">Indicadores negativos</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {(request.riskAnalysis.negativeIndicatorsJson as string[] | null)?.map((n, i) => <li key={i}>{n}</li>)}
                        {((request.riskAnalysis.negativeIndicatorsJson as string[] | null)?.length ?? 0) === 0 && (
                          <li className="list-none">Nenhum</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {request.riskAnalysis.alerts.length > 0 && (
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-base">Alertas</CardTitle>
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
            </div>
          ) : (
            <EmptyState icon={Gauge} title="Score de risco ainda não calculado" description="A análise automática ainda está em andamento ou aguardando revisão." />
          )}

          {request.technicalAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análise técnica do arquivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <ScoreField label="Metadados" value={request.technicalAnalysis.metadataRiskScore} />
                  <ScoreField label="Manipulação (geral)" value={request.technicalAnalysis.manipulationRiskScore} />
                  <ScoreField label="Autenticidade do conteúdo" value={request.technicalAnalysis.contentAuthenticityRiskScore} />
                  <div className="rounded-lg border border-border p-3">
                    <ScoreField label="Possível geração por IA" value={request.technicalAnalysis.aiGenerationRiskScore} bare />
                    <Badge variant="outline" className="mt-1">
                      {request.technicalAnalysis.externalProviderName ? `Fonte: ${request.technicalAnalysis.externalProviderName}` : "Fonte: metadados"}
                    </Badge>
                  </div>
                </div>
                {Array.isArray(request.technicalAnalysis.findingsJson) && (request.technicalAnalysis.findingsJson as unknown[]).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Observações técnicas</p>
                    {(request.technicalAnalysis.findingsJson as { area: string; description: string; severity: string }[]).map((f, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium">{f.area}</p>
                        <p className="text-muted-foreground">{f.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Detalhamento completo em <span className="font-medium">Análise técnica</span>, <span className="font-medium">Médico</span>,{" "}
                  <span className="font-medium">Clínica</span> e <span className="font-medium">Score de risco</span>.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Dados da solicitação</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Enviado por</p>
                  <p className="font-medium">{request.submittedBy.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Canal</p>
                  <p className="font-medium">{request.submissionChannel}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Analista responsável</p>
                  <p className="font-medium">{request.assignedTo?.name ?? "Não atribuído"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Supervisor</p>
                  <p className="font-medium">{request.supervisor?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recebido pela empresa em</p>
                  <p className="font-medium">{formatDate(request.receivedByCompanyAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Base legal</p>
                  <p className="font-medium">{request.consentOrLegalBasis}</p>
                </div>
                {request.internalNotes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notas internas</p>
                    <p className="font-medium">{request.internalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="flex items-center justify-center">
              <CardContent className="p-5">
                {request.confidenceScore !== null ? (
                  <ScoreIndicator score={request.confidenceScore} label="Confiança da leitura (OCR)" />
                ) : (
                  <p className="text-sm text-muted-foreground">Score de leitura ainda não calculado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Document */}
        <TabsContent value="document">
          {primaryFile ? (
            <DocumentViewer file={primaryFile} />
          ) : (
            <EmptyState icon={FileText} title="Nenhum documento anexado" />
          )}
        </TabsContent>

        {/* Extracted data */}
        <TabsContent value="extracted">
          {request.extractedData ? (
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <Field label="Médico" value={request.extractedData.doctorName} />
                <Field label="CRM" value={`${request.extractedData.doctorCrm ?? "—"} / ${request.extractedData.doctorCrmUf ?? "—"}`} />
                <Field label="Data de emissão" value={formatDate(request.extractedData.certificateIssueDate)} />
                <Field label="Dias de afastamento" value={request.extractedData.absenceDays?.toString()} />
                <Field label="Período" value={`${formatDate(request.extractedData.absenceStartDate)} a ${formatDate(request.extractedData.absenceEndDate)}`} />
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

        {/* Doctor */}
        <TabsContent value="doctor">
          {request.doctorVerification ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Validação do médico</CardTitle>
                  <Badge variant="outline">{VERIFICATION_STATUS_LABELS[request.doctorVerification.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Nome informado" value={request.doctorVerification.informedDoctorName} />
                <Field label="Nome oficial" value={request.doctorVerification.officialDoctorName} />
                <Field label="CRM informado" value={`${request.doctorVerification.informedCrm ?? "—"}/${request.doctorVerification.informedCrmUf ?? "—"}`} />
                <Field label="CRM oficial" value={`${request.doctorVerification.officialCrm ?? "—"}/${request.doctorVerification.officialCrmUf ?? "—"}`} />
                <Field label="Situação" value={request.doctorVerification.registrationStatus} />
                <Field label="Especialidade" value={request.doctorVerification.specialty} />
                <Field label="Fonte" value={request.doctorVerification.sourceName} />
                <Field label="Match score" value={request.doctorVerification.matchScore?.toString()} />
                {request.doctorVerification.notes && (
                  <div className="col-span-2 rounded-lg bg-muted/50 p-3">{request.doctorVerification.notes}</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScanSearch} title="Validação do médico ainda não concluída" />
          )}
        </TabsContent>

        {/* Clinic */}
        <TabsContent value="clinic">
          {request.clinicVerification ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Validação da clínica/hospital</CardTitle>
                  <Badge variant="outline">{VERIFICATION_STATUS_LABELS[request.clinicVerification.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Nome informado" value={request.clinicVerification.informedClinicName} />
                <Field label="Nome oficial" value={request.clinicVerification.officialName} />
                <Field label="CNPJ informado" value={request.clinicVerification.informedCnpj} />
                <Field label="CNPJ oficial" value={request.clinicVerification.officialCnpj} />
                <Field label="Endereço oficial" value={request.clinicVerification.officialAddress} />
                <Field label="Website" value={request.clinicVerification.website} />
                <Field label="Fonte" value={request.clinicVerification.sourceName} />
                <Field label="Match score" value={request.clinicVerification.matchScore?.toString()} />
                {request.clinicVerification.notes && (
                  <div className="col-span-2 rounded-lg bg-muted/50 p-3">{request.clinicVerification.notes}</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScanSearch} title="Validação da clínica ainda não concluída" />
          )}
        </TabsContent>

        {/* QR Code */}
        <TabsContent value="qrcode">
          {request.qrCodeVerification ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Verificação de QR Code</CardTitle>
                  <Badge variant="outline">{QR_STATUS_LABELS[request.qrCodeVerification.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Link de autenticação" value={request.qrCodeVerification.authenticationUrl} />
                <Field label="Domínio" value={request.qrCodeVerification.domain} />
                <Field label="Domínio confiável" value={request.qrCodeVerification.isDomainTrusted ? "Sim" : "Não"} />
                <Field label="HTTP status" value={request.qrCodeVerification.httpStatus?.toString()} />
                <Field label="Match score" value={request.qrCodeVerification.matchScore?.toString()} />
                {request.qrCodeVerification.notes && (
                  <div className="col-span-2 rounded-lg bg-muted/50 p-3">{request.qrCodeVerification.notes}</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={Link2} title="Sem verificação de QR Code" />
          )}
        </TabsContent>

        {/* Technical analysis */}
        <TabsContent value="technical">
          {request.technicalAnalysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análise técnica do arquivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <ScoreField label="Metadados" value={request.technicalAnalysis.metadataRiskScore} />
                  <ScoreField label="Manipulação (geral)" value={request.technicalAnalysis.manipulationRiskScore} />
                  <ScoreField label="Autenticidade do conteúdo" value={request.technicalAnalysis.contentAuthenticityRiskScore} />
                  <div className="rounded-lg border border-border p-3">
                    <ScoreField label="Possível geração por IA" value={request.technicalAnalysis.aiGenerationRiskScore} bare />
                    <Badge variant="outline" className="mt-1">
                      {request.technicalAnalysis.externalProviderName ? `Fonte: ${request.technicalAnalysis.externalProviderName}` : "Fonte: metadados"}
                    </Badge>
                  </div>
                  <ScoreField label="Compressão de imagem" value={request.technicalAnalysis.compressionInconsistencyScore} />
                  <ScoreField label="Tipografia" value={request.technicalAnalysis.fontInconsistencyScore} />
                  <ScoreField label="Camadas do PDF" value={request.technicalAnalysis.layerInconsistencyScore} />
                  <ScoreField label="Assinatura/Carimbo" value={request.technicalAnalysis.signatureStampInconsistencyScore} />
                </div>
                {Array.isArray(request.technicalAnalysis.findingsJson) && (request.technicalAnalysis.findingsJson as unknown[]).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Observações técnicas</p>
                    {(request.technicalAnalysis.findingsJson as { area: string; description: string; severity: string }[]).map((f, i) => (
                      <div key={i} className="rounded-lg border border-border p-3 text-sm">
                        <p className="font-medium">{f.area}</p>
                        <p className="text-muted-foreground">{f.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScanSearch} title="Análise técnica ainda não concluída" />
          )}
        </TabsContent>

        {/* Similarity */}
        <TabsContent value="similarity">
          <div className="space-y-3">
            {request.fingerprint && (
              <Card>
                <CardContent className="grid grid-cols-2 gap-3 p-5 text-sm sm:grid-cols-3">
                  <Field label="Hash do arquivo" value={request.fingerprint.fileHash.slice(0, 24) + "…"} mono />
                  <Field label="Hash perceptual" value={request.fingerprint.perceptualHash} mono />
                  <Field label="Hash de layout" value={request.fingerprint.layoutHash} mono />
                </CardContent>
              </Card>
            )}
            {request.similarityMatches.length > 0 ? (
              request.similarityMatches.map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium">{m.matchedRequest.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{m.explanation}</p>
                    </div>
                    <Badge variant="outline">{m.similarityScore}% · {m.matchType}</Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <EmptyState icon={Fingerprint} title="Nenhuma similaridade relevante encontrada" />
            )}
          </div>
        </TabsContent>

        {/* Risk */}
        <TabsContent value="risk">
          {request.riskAnalysis ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="flex items-center justify-center lg:col-span-1">
                <CardContent className="p-5">
                  <ScoreIndicator score={request.riskAnalysis.score} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{request.riskAnalysis.summary}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="mb-1 font-medium text-status-success">Indicadores positivos</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {(request.riskAnalysis.positiveIndicatorsJson as string[] | null)?.map((p, i) => <li key={i}>{p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 font-medium text-status-danger">Indicadores negativos</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                        {(request.riskAnalysis.negativeIndicatorsJson as string[] | null)?.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-base">Alertas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.riskAnalysis.alerts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta gerado.</p>}
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
            </div>
          ) : (
            <EmptyState icon={Gauge} title="Score de risco ainda não calculado" />
          )}
        </TabsContent>

        {/* Contacts */}
        <TabsContent value="contacts" className="space-y-4">
          {canReview && (
            <div className="flex justify-end">
              <ContactAttemptForm requestId={request.id} />
            </div>
          )}
          {request.contactAttempts.length === 0 ? (
            <EmptyState icon={Phone} title="Nenhum contato registrado" />
          ) : (
            <div className="space-y-2">
              {request.contactAttempts.map((c) => (
                <Card key={c.id}>
                  <CardContent className="p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.contactTarget}</p>
                      <Badge variant="outline">{c.result}</Badge>
                    </div>
                    <p className="text-muted-foreground">{c.contactValue} · {c.contactType}</p>
                    {c.notes && <p className="mt-1">{c.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(c.attemptedAt)} · {c.responsibleUser.name}
                    </p>
                    {c.evidenceFile && <EvidenceFileLink file={c.evidenceFile} />}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens</CardTitle>
            </CardHeader>
            <CardContent>
              <WhatsAppPanel requestId={request.id} messages={whatsAppMessages} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="p-5">
              <Timeline
                showVisibilityBadge
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

        {/* Audit */}
        <TabsContent value="audit">
          {request.auditLogs.length === 0 ? (
            <EmptyState icon={History} title="Nenhum registro de auditoria" />
          ) : (
            <div className="rounded-xl border border-border bg-card">
              {request.auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm last:border-0">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.entityType} · {log.user?.name ?? "Sistema"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Final report */}
        <TabsContent value="report" className="space-y-4">
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
                      <PrintReportButton />
                      {!request.finalReport.approvedAt && canApprove && <ApproveReportButton reportId={request.finalReport.id} />}
                      {!request.finalReport.approvedAt && !canApprove && <Badge variant="warning">Aguardando aprovação</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{request.finalReport.executiveSummary}</p>
                  {request.finalReport.limitations && (
                    <div>
                      <p className="font-medium">Limitações</p>
                      <p className="text-muted-foreground">{request.finalReport.limitations}</p>
                    </div>
                  )}
                  {request.finalReport.internalNotes && (
                    <div className="rounded-lg bg-muted/50 p-3 print:hidden">{request.finalReport.internalNotes}</div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Emitido em {formatDateTime(request.finalReport.generatedAt)}
                    {request.finalReport.approvedAt && ` · Aprovado em ${formatDateTime(request.finalReport.approvedAt)}`}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : canReview ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Emitir parecer</CardTitle>
              </CardHeader>
              <CardContent>
                <FinalReportForm requestId={request.id} />
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={ScrollText} title="Parecer ainda não emitido" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreField({ label, value, bare }: { label: string; value: number | null; bare?: boolean }) {
  const tone = value === null ? "text-muted-foreground" : value >= 55 ? "text-status-danger" : value >= 30 ? "text-status-warning" : "text-status-success";
  const content = (
    <>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value ?? "—"}</p>
    </>
  );
  if (bare) return content;
  return <div className="rounded-lg border border-border p-3">{content}</div>;
}
