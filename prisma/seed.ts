import { PrismaClient, type RequestStatus, type RiskLevel, type FinalResult } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

const STORAGE_ROOT = path.join(process.cwd(), ".local-storage");
const CERTIFICATES_BUCKET = "medical-certificates";

// Mirrors src/lib/supabase.ts's isSupabaseConfigured check — this script runs
// standalone via tsx, so it can't import the path-aliased app module and
// re-derives the same guard against .env.example's literal placeholders.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseConfigured =
  !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes("[YOUR-PROJECT-REF]") && supabaseUrl.startsWith("http");
const supabaseAdmin = supabaseConfigured ? createClient(supabaseUrl!, supabaseKey!) : null;

// Minimal valid one-page PDF so the document viewer can render seeded files.
const MOCK_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n" +
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n" +
    "5 0 obj<</Length 78>>stream\nBT /F1 14 Tf 72 720 Td (ATESTADO MEDICO - Documento de demonstracao MedCheck) Tj ET\nendstream endobj\n" +
    "trailer<</Root 1 0 R>>",
  "utf-8",
);

async function writeMockFile(requestId: string): Promise<{ storagePath: string; sha256Hash: string; fileSize: number }> {
  const storagePath = `${requestId}/${crypto.randomUUID()}.pdf`;
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.storage
      .from(CERTIFICATES_BUCKET)
      .upload(storagePath, MOCK_PDF, { contentType: "application/pdf" });
    if (error) throw new Error(`Failed to upload seed file to Supabase Storage: ${error.message}`);
  } else {
    const full = path.join(STORAGE_ROOT, CERTIFICATES_BUCKET, storagePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, MOCK_PDF);
  }
  const sha256Hash = crypto.createHash("sha256").update(MOCK_PDF).digest("hex");
  return { storagePath, sha256Hash, fileSize: MOCK_PDF.byteLength };
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function hoursFromNow(n: number) {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d;
}
function maskCpf(cpf: string) {
  const digits = cpf.replace(/\D/g, "");
  return `***.${digits.slice(3, 6)}.***-${digits.slice(9, 11)}`;
}

async function main() {
  console.log("Seeding MedCheck database...");
  const passwordHash = await bcrypt.hash("password123", 10);

  // ---------------------------------------------------------------------
  // Internal staff
  // ---------------------------------------------------------------------
  const superAdmin = await prisma.user.create({
    data: { name: "Helena Duarte", email: "superadmin@medcheck.com.br", role: "SUPER_ADMIN", passwordHash, mfaEnabled: true },
  });
  const internalAdmin = await prisma.user.create({
    data: { name: "Rodrigo Fontes", email: "admin.interno@medcheck.com.br", role: "INTERNAL_ADMIN", passwordHash },
  });
  const supervisor = await prisma.user.create({
    data: { name: "Marina Castilho", email: "supervisor@medcheck.com.br", role: "INTERNAL_SUPERVISOR", passwordHash },
  });
  const analyst1 = await prisma.user.create({
    data: { name: "Bruno Salgado", email: "analista1@medcheck.com.br", role: "INTERNAL_ANALYST", passwordHash },
  });
  const analyst2 = await prisma.user.create({
    data: { name: "Carla Nery", email: "analista2@medcheck.com.br", role: "INTERNAL_ANALYST", passwordHash },
  });

  // ---------------------------------------------------------------------
  // Organizations
  // ---------------------------------------------------------------------
  const orgA = await prisma.organization.create({
    data: {
      name: "Grupo Horizonte Logística",
      legalName: "Horizonte Logística e Transportes S.A.",
      tradeName: "Horizonte Log",
      cnpj: "12.345.678/0001-90",
      email: "rh@horizontelog.com.br",
      phone: "(11) 4002-8922",
      address: "Av. das Nações, 1200 - São Paulo/SP",
      status: "ACTIVE",
      slaHours: 48,
      dataRetentionDays: 365,
    },
  });
  const orgB = await prisma.organization.create({
    data: {
      name: "NovaTech Serviços Digitais",
      legalName: "NovaTech Serviços Digitais Ltda.",
      tradeName: "NovaTech",
      cnpj: "98.765.432/0001-10",
      email: "pessoas@novatech.com.br",
      phone: "(21) 3003-1155",
      address: "Rua do Comércio, 456 - Rio de Janeiro/RJ",
      status: "TRIAL",
      slaHours: 72,
      dataRetentionDays: 180,
    },
  });

  await prisma.dataRetentionPolicy.createMany({
    data: [
      { organizationId: orgA.id, retentionDays: 365, autoAnonymize: true, autoDeleteFiles: false },
      { organizationId: orgB.id, retentionDays: 180, autoAnonymize: false, autoDeleteFiles: false },
    ],
  });

  await prisma.whatsAppIntegration.createMany({
    data: [
      { organizationId: orgA.id, provider: "META_CLOUD_API", phoneNumberId: "109876543210", status: "ACTIVE" },
      { organizationId: orgB.id, provider: "OTHER", status: "PENDING_SETUP" },
    ],
  });

  const apiKeyRaw = `mck_${crypto.randomBytes(24).toString("hex")}`;
  await prisma.apiKey.create({
    data: {
      organizationId: orgA.id,
      name: "Integração RH (demo)",
      keyHash: crypto.createHash("sha256").update(apiKeyRaw).digest("hex"),
      keyPrefix: apiKeyRaw.slice(0, 12),
    },
  });

  await prisma.webhookEndpoint.create({
    data: {
      organizationId: orgA.id,
      url: "https://example.com/webhooks/medcheck-demo",
      secret: crypto.randomBytes(16).toString("hex"),
      eventsJson: ["request.received", "request.completed", "request.inconsistent"],
    },
  });

  // ---------------------------------------------------------------------
  // Client users
  // ---------------------------------------------------------------------
  const clientAdminA = await prisma.user.create({
    data: { organizationId: orgA.id, name: "Patrícia Lemos", email: "patricia.lemos@horizontelog.com.br", role: "CLIENT_ADMIN", passwordHash },
  });
  const clientUserA1 = await prisma.user.create({
    data: { organizationId: orgA.id, name: "Diego Amaral", email: "diego.amaral@horizontelog.com.br", role: "CLIENT_USER", passwordHash },
  });
  const clientUserA2 = await prisma.user.create({
    data: { organizationId: orgA.id, name: "Sabrina Toledo", email: "sabrina.toledo@horizontelog.com.br", role: "CLIENT_USER", passwordHash },
  });
  const clientAdminB = await prisma.user.create({
    data: { organizationId: orgB.id, name: "Felipe Marques", email: "felipe.marques@novatech.com.br", role: "CLIENT_ADMIN", passwordHash },
  });
  const clientUserB1 = await prisma.user.create({
    data: { organizationId: orgB.id, name: "Aline Bittencourt", email: "aline.bittencourt@novatech.com.br", role: "CLIENT_USER", passwordHash },
  });

  for (const u of [clientAdminA, clientUserA1, clientUserA2, clientAdminB, clientUserB1]) {
    await prisma.notificationPreference.create({
      data: { organizationId: u.organizationId!, userId: u.id },
    });
  }

  const doctors = [
    { name: "Dra. Fernanda Ribeiro Alves", crm: "84213", uf: "SP", specialty: "Clínica Geral" },
    { name: "Dr. Marcelo Souza Lima", crm: "77654", uf: "RJ", specialty: "Ortopedia" },
    { name: "Dra. Juliana Prado Martins", crm: "65321", uf: "MG", specialty: "Medicina do Trabalho" },
    { name: "Dr. Rafael Costa Nogueira", crm: "45210", uf: "RS", specialty: "Cardiologia" },
    { name: "Dra. Camila Andrade Teixeira", crm: "39871", uf: "PR", specialty: "Psiquiatria" },
  ];
  const clinics = [
    { name: "Clínica Vida Plena", cnpj: "11.222.333/0001-44", cnes: "2077639", phone: "(11) 3345-9922" },
    { name: "Hospital Santa Clara", cnpj: "22.333.444/0001-55", cnes: "3098214", phone: "(21) 2244-8811" },
    { name: "Centro Médico Bem Estar", cnpj: "33.444.555/0001-66", cnes: "4109325", phone: "(31) 3355-7700" },
    { name: "Instituto de Saúde Ocupacional São Lucas", cnpj: "44.555.666/0001-77", cnes: "5210436", phone: "(51) 3466-6600" },
  ];
  const employees = [
    "Anderson Vieira Costa", "Beatriz Lopes Ferreira", "Caio Henrique Barbosa", "Debora Cristina Rocha",
    "Eduardo Matos Pereira", "Fabiana Souza Cardoso", "Gustavo Henrique Melo", "Helena Torres Xavier",
    "Igor Ramalho Duarte", "Juliana Freitas Nogueira", "Kleber Augusto Sena", "Larissa Moura Batista",
    "Marcos Vinícius Tavares", "Natália Correia Brandão", "Otávio Fernandes Rezende", "Priscila Andrade Guimarães",
    "Renato Barbosa Siqueira", "Simone Rocha Almeida", "Thiago Nascimento Pires", "Vanessa Lima Cavalcante",
  ];

  type Scenario = {
    employee: string;
    org: typeof orgA;
    status: RequestStatus;
    riskLevel: RiskLevel | null;
    score: number | null;
    finalResult: FinalResult | null;
    doctorStatus: "VALIDATED" | "NOT_FOUND" | "DIVERGENT" | "INCONCLUSIVE";
    clinicStatus: "VALIDATED" | "NOT_FOUND" | "DIVERGENT" | "INCONCLUSIVE";
    qrStatus: "NOT_PRESENT" | "VALID" | "INVALID" | "DOMAIN_SUSPICIOUS" | "DATA_MISMATCH";
    hasContact: boolean;
    hasWhatsApp: boolean;
    hasDispute: boolean;
    assignedTo?: typeof analyst1;
    supervisorUser?: typeof supervisor;
  };

  const scenarios: Scenario[] = [
    { employee: employees[0], org: orgA, status: "VALIDATED", riskLevel: "VERY_LOW", score: 96, finalResult: "VALIDATED", doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "VALID", hasContact: false, hasWhatsApp: true, hasDispute: false, assignedTo: analyst1 },
    { employee: employees[1], org: orgA, status: "VALIDATED_WITH_REMARKS", riskLevel: "LOW", score: 88, finalResult: "VALIDATED_WITH_REMARKS", doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: true, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[2], org: orgB, status: "VALIDATED", riskLevel: "VERY_LOW", score: 98, finalResult: "VALIDATED", doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "VALID", hasContact: false, hasWhatsApp: false, hasDispute: false, assignedTo: analyst1 },
    { employee: employees[3], org: orgA, status: "WAITING_HUMAN_REVIEW", riskLevel: "LOW", score: 82, finalResult: null, doctorStatus: "VALIDATED", clinicStatus: "NOT_FOUND", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: true, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[4], org: orgB, status: "WAITING_HUMAN_REVIEW", riskLevel: "MEDIUM", score: 71, finalResult: null, doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: false, hasDispute: false, assignedTo: analyst1 },
    { employee: employees[5], org: orgA, status: "WAITING_CLINIC_CONTACT", riskLevel: "MEDIUM", score: 58, finalResult: null, doctorStatus: "VALIDATED", clinicStatus: "NOT_FOUND", qrStatus: "INVALID", hasContact: false, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[6], org: orgA, status: "CLINIC_CONTACTED", riskLevel: "MEDIUM", score: 60, finalResult: null, doctorStatus: "VALIDATED", clinicStatus: "DIVERGENT", qrStatus: "NOT_PRESENT", hasContact: true, hasWhatsApp: true, hasDispute: false, assignedTo: analyst1 },
    { employee: employees[7], org: orgB, status: "WAITING_EXTERNAL_RESPONSE", riskLevel: "MEDIUM", score: 55, finalResult: null, doctorStatus: "INCONCLUSIVE", clinicStatus: "NOT_FOUND", qrStatus: "NOT_PRESENT", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[8], org: orgA, status: "SUPERVISOR_REVIEW", riskLevel: "HIGH", score: 32, finalResult: null, doctorStatus: "DIVERGENT", clinicStatus: "NOT_FOUND", qrStatus: "DOMAIN_SUSPICIOUS", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst1, supervisorUser: supervisor },
    { employee: employees[9], org: orgB, status: "SUPERVISOR_REVIEW", riskLevel: "CRITICAL", score: 21, finalResult: null, doctorStatus: "NOT_FOUND", clinicStatus: "DIVERGENT", qrStatus: "DATA_MISMATCH", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2, supervisorUser: supervisor },
    { employee: employees[10], org: orgA, status: "NOT_RECOGNIZED_BY_INSTITUTION", riskLevel: "CRITICAL", score: 12, finalResult: "NOT_RECOGNIZED_BY_INSTITUTION", doctorStatus: "NOT_FOUND", clinicStatus: "DIVERGENT", qrStatus: "INVALID", hasContact: true, hasWhatsApp: true, hasDispute: true, assignedTo: analyst1, supervisorUser: supervisor },
    { employee: employees[11], org: orgB, status: "INCONSISTENT", riskLevel: "HIGH", score: 28, finalResult: "INCONSISTENT", doctorStatus: "DIVERGENT", clinicStatus: "NOT_FOUND", qrStatus: "DOMAIN_SUSPICIOUS", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2, supervisorUser: supervisor },
    { employee: employees[12], org: orgA, status: "NOT_CONFIRMED", riskLevel: "HIGH", score: 34, finalResult: "NOT_CONFIRMED", doctorStatus: "NOT_FOUND", clinicStatus: "NOT_FOUND", qrStatus: "NOT_PRESENT", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst1, supervisorUser: supervisor },
    { employee: employees[13], org: orgA, status: "INCONCLUSIVE", riskLevel: "MEDIUM", score: 50, finalResult: "INCONCLUSIVE", doctorStatus: "INCONCLUSIVE", clinicStatus: "INCONCLUSIVE", qrStatus: "NOT_PRESENT", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[14], org: orgB, status: "CONTESTED", riskLevel: "MEDIUM", score: 62, finalResult: "VALIDATED_WITH_REMARKS", doctorStatus: "VALIDATED", clinicStatus: "DIVERGENT", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: false, hasDispute: true, assignedTo: analyst1 },
    { employee: employees[15], org: orgA, status: "RECEIVED", riskLevel: null, score: null, finalResult: null, doctorStatus: "INCONCLUSIVE", clinicStatus: "INCONCLUSIVE", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: true, hasDispute: false },
    { employee: employees[16], org: orgA, status: "PROCESSING", riskLevel: null, score: null, finalResult: null, doctorStatus: "INCONCLUSIVE", clinicStatus: "INCONCLUSIVE", qrStatus: "NOT_PRESENT", hasContact: false, hasWhatsApp: true, hasDispute: false },
    { employee: employees[17], org: orgB, status: "VALIDATED", riskLevel: "LOW", score: 85, finalResult: "VALIDATED", doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "VALID", hasContact: false, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2 },
    { employee: employees[18], org: orgA, status: "VALIDATED_WITH_REMARKS", riskLevel: "LOW", score: 79, finalResult: "VALIDATED_WITH_REMARKS", doctorStatus: "VALIDATED", clinicStatus: "NOT_FOUND", qrStatus: "NOT_PRESENT", hasContact: true, hasWhatsApp: false, hasDispute: false, assignedTo: analyst1 },
    { employee: employees[19], org: orgB, status: "WAITING_HUMAN_REVIEW", riskLevel: "MEDIUM", score: 68, finalResult: null, doctorStatus: "VALIDATED", clinicStatus: "VALIDATED", qrStatus: "INVALID", hasContact: false, hasWhatsApp: false, hasDispute: false, assignedTo: analyst2 },
  ];

  let requestCounter = 0;
  for (const scenario of scenarios) {
    requestCounter += 1;
    const doctor = doctors[requestCounter % doctors.length];
    const clinic = clinics[requestCounter % clinics.length];
    const submittedBy = scenario.org.id === orgA.id ? (requestCounter % 2 === 0 ? clientUserA1 : clientUserA2) : clientUserB1;
    const createdAt = daysAgo(20 - requestCounter);
    const absenceDays = [1, 2, 3, 5, 7][requestCounter % 5];
    const issueDate = daysAgo(20 - requestCounter + 1);
    const absenceStart = new Date(issueDate);
    const absenceEnd = new Date(issueDate);
    absenceEnd.setDate(absenceEnd.getDate() + absenceDays - 1);

    const isCompleted = scenario.finalResult !== null;
    const completedAt = isCompleted ? daysAgo(20 - requestCounter - 2) : null;

    const cpf = `${100 + requestCounter}.${200 + requestCounter}.${300 + requestCounter}-${10 + (requestCounter % 89)}`;

    const req = await prisma.medicalCertificateRequest.create({
      data: {
        organizationId: scenario.org.id,
        submittedByUserId: submittedBy.id,
        assignedToUserId: scenario.assignedTo?.id,
        supervisorUserId: scenario.supervisorUser?.id,
        employeeName: scenario.employee,
        employeeDocumentMasked: maskCpf(cpf),
        employeeRegistration: `MAT-${1000 + requestCounter}`,
        employeeEmail: `${scenario.employee.split(" ")[0].toLowerCase()}@colaborador.com.br`,
        receivedByCompanyAt: createdAt,
        submissionChannel: "WEB_UPLOAD",
        status: scenario.status,
        priority: requestCounter % 7 === 0 ? "HIGH" : "NORMAL",
        slaDueAt: isCompleted ? completedAt! : hoursFromNow((requestCounter % 5) * 6 - 12),
        completedAt,
        finalResult: scenario.finalResult ?? undefined,
        confidenceScore: scenario.score ?? undefined,
        riskLevel: scenario.riskLevel ?? undefined,
        clientVisibleSummary: scenario.finalResult ? clientSummaryFor(scenario.finalResult) : null,
        consentOrLegalBasis: "execucao_contrato_trabalho",
        treatmentPurpose: "Validar a autenticidade do atestado apresentado para fins de abono de ausência.",
        retentionUntil: daysFromNow(scenario.org.dataRetentionDays),
        createdAt,
      },
    });

    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "REQUEST_CREATED", title: "Solicitação criada", isClientVisible: true, createdAt, userId: submittedBy.id },
    });

    const file = await writeMockFile(req.id);
    const document = await prisma.documentFile.create({
      data: {
        requestId: req.id,
        storageBucket: CERTIFICATES_BUCKET,
        storagePath: file.storagePath,
        originalFileName: `atestado-${scenario.employee.split(" ")[0].toLowerCase()}.pdf`,
        fileType: "PDF",
        mimeType: "application/pdf",
        fileSize: file.fileSize,
        sha256Hash: file.sha256Hash,
        uploadedByUserId: submittedBy.id,
        createdAt,
      },
    });
    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "FILE_UPLOADED", title: "Documento enviado", description: document.originalFileName, isClientVisible: true, createdAt },
    });

    if (scenario.status === "RECEIVED") continue; // no further processing yet

    await prisma.extractedData.create({
      data: {
        requestId: req.id,
        rawText: "ATESTADO MÉDICO — documento de demonstração MedCheck.",
        doctorName: doctor.name,
        doctorCrm: doctor.crm,
        doctorCrmUf: doctor.uf,
        certificateIssueDate: issueDate,
        absenceDays,
        absenceStartDate: absenceStart,
        absenceEndDate: absenceEnd,
        clinicName: clinic.name,
        clinicCnpj: clinic.cnpj,
        clinicCnes: clinic.cnes,
        clinicAddress: "Av. Principal, 500",
        clinicPhone: clinic.phone,
        clinicEmail: `contato@${clinic.name.toLowerCase().replace(/[^a-z]+/g, "")}.com.br`,
        cidCode: "M54.5",
        qrCodeContent: scenario.qrStatus !== "NOT_PRESENT" ? "https://autenticidade.saude.gov.br/verificar/482913" : null,
        authenticationUrl: scenario.qrStatus !== "NOT_PRESENT" ? "https://autenticidade.saude.gov.br/verificar/482913" : null,
        confidenceJson: { doctorName: 92, clinicName: 88 },
        extractionWarningsJson: requestCounter % 6 === 0 ? ["Baixa nitidez detectada em parte do documento."] : [],
      },
    });
    if (scenario.status === "PROCESSING") continue;

    await prisma.doctorVerification.create({
      data: {
        requestId: req.id,
        informedDoctorName: doctor.name,
        informedCrm: doctor.crm,
        informedCrmUf: doctor.uf,
        officialDoctorName: scenario.doctorStatus === "VALIDATED" ? doctor.name : scenario.doctorStatus === "DIVERGENT" ? doctor.name.split(" ")[0] : null,
        officialCrm: scenario.doctorStatus !== "NOT_FOUND" ? doctor.crm : null,
        officialCrmUf: scenario.doctorStatus !== "NOT_FOUND" ? doctor.uf : null,
        registrationStatus: scenario.doctorStatus === "VALIDATED" || scenario.doctorStatus === "DIVERGENT" ? "Ativo" : null,
        specialty: scenario.doctorStatus !== "NOT_FOUND" ? doctor.specialty : null,
        sourceName: "Conselho Regional de Medicina (mock)",
        sourceUrl: `https://mock-crm-registry.example/crm/${doctor.uf}/${doctor.crm}`,
        matchScore: scenario.doctorStatus === "VALIDATED" ? 97 : scenario.doctorStatus === "DIVERGENT" ? 42 : scenario.doctorStatus === "NOT_FOUND" ? 0 : 55,
        status: scenario.doctorStatus,
        checkedAt: createdAt,
        notes: scenario.doctorStatus === "DIVERGENT" ? "Nome informado difere do nome registrado para este CRM." : null,
      },
    });
    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "DOCTOR_VERIFICATION_COMPLETED", title: "Validação do médico concluída", isClientVisible: true, createdAt },
    });

    await prisma.clinicVerification.create({
      data: {
        requestId: req.id,
        informedClinicName: clinic.name,
        informedCnpj: clinic.cnpj,
        informedCnes: clinic.cnes,
        informedPhone: clinic.phone,
        officialName: scenario.clinicStatus === "VALIDATED" || scenario.clinicStatus === "DIVERGENT" ? clinic.name : null,
        officialCnpj: scenario.clinicStatus !== "NOT_FOUND" ? clinic.cnpj : null,
        officialCnes: scenario.clinicStatus !== "NOT_FOUND" ? clinic.cnes : null,
        officialAddress: scenario.clinicStatus === "DIVERGENT" ? "Endereço oficial diverge do informado" : "Av. Principal, 500",
        officialPhone: clinic.phone,
        website: scenario.clinicStatus === "VALIDATED" ? `https://${clinic.name.toLowerCase().replace(/[^a-z]+/g, "")}.com.br` : null,
        sourceName: "Cadastro CNES / Receita Federal (mock)",
        sourceUrl: `https://mock-cnpj-lookup.example/cnpj/${clinic.cnpj}`,
        matchScore: scenario.clinicStatus === "VALIDATED" ? 95 : scenario.clinicStatus === "DIVERGENT" ? 48 : scenario.clinicStatus === "NOT_FOUND" ? 0 : 50,
        status: scenario.clinicStatus,
        checkedAt: createdAt,
        notes: scenario.clinicStatus === "NOT_FOUND" ? "Nenhum registro localizado para os dados informados." : null,
      },
    });
    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "CLINIC_VERIFICATION_COMPLETED", title: "Validação da clínica concluída", isClientVisible: true, createdAt },
    });

    await prisma.qrCodeVerification.create({
      data: {
        requestId: req.id,
        qrCodeContent: scenario.qrStatus !== "NOT_PRESENT" ? "https://autenticidade.saude.gov.br/verificar/482913" : null,
        authenticationUrl: scenario.qrStatus !== "NOT_PRESENT" ? "https://autenticidade.saude.gov.br/verificar/482913" : null,
        domain: scenario.qrStatus !== "NOT_PRESENT" ? "autenticidade.saude.gov.br" : null,
        isDomainTrusted: scenario.qrStatus === "VALID" || scenario.qrStatus === "DATA_MISMATCH",
        httpStatus: scenario.qrStatus === "NOT_PRESENT" ? null : scenario.qrStatus === "INVALID" ? 404 : 200,
        matchScore: scenario.qrStatus === "VALID" ? 98 : scenario.qrStatus === "DATA_MISMATCH" ? 40 : null,
        status: scenario.qrStatus,
        checkedAt: scenario.qrStatus === "NOT_PRESENT" ? null : createdAt,
        notes: scenario.qrStatus === "DOMAIN_SUSPICIOUS" ? "Domínio fora da lista de emissores confiáveis conhecidos." : null,
      },
    });

    const manipulationScore = scenario.riskLevel === "CRITICAL" ? 68 : scenario.riskLevel === "HIGH" ? 52 : scenario.riskLevel === "MEDIUM" ? 28 : 10;
    await prisma.technicalAnalysis.create({
      data: {
        requestId: req.id,
        metadataRiskScore: manipulationScore,
        manipulationRiskScore: manipulationScore,
        aiGenerationRiskScore: Math.max(manipulationScore - 20, 5),
        compressionInconsistencyScore: Math.max(manipulationScore - 10, 5),
        fontInconsistencyScore: Math.max(manipulationScore - 15, 3),
        layerInconsistencyScore: Math.max(manipulationScore - 12, 4),
        signatureStampInconsistencyScore: Math.max(manipulationScore - 8, 5),
        findingsJson:
          manipulationScore >= 50
            ? [{ area: "Metadados", description: "Possíveis indícios de edição identificados nos metadados do arquivo.", severity: "high" }]
            : [],
        status: "COMPLETED",
        analyzedAt: createdAt,
      },
    });
    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "TECHNICAL_ANALYSIS_COMPLETED", title: "Análise técnica concluída", isClientVisible: false, createdAt },
    });

    await prisma.documentFingerprint.create({
      data: {
        requestId: req.id,
        fileHash: file.sha256Hash,
        perceptualHash: crypto.createHash("sha256").update(file.sha256Hash + "p").digest("hex").slice(0, 16),
        layoutHash: crypto.createHash("sha256").update(file.sha256Hash + "l").digest("hex").slice(0, 16),
        textHash: crypto.createHash("sha256").update(file.sha256Hash + "t").digest("hex").slice(0, 16),
      },
    });
    await prisma.requestTimelineEvent.create({
      data: { requestId: req.id, eventType: "FINGERPRINT_GENERATED", title: "Fingerprint documental gerado", isClientVisible: false, createdAt },
    });

    if (scenario.score !== null && scenario.riskLevel) {
      const riskAnalysis = await prisma.riskAnalysis.create({
        data: {
          requestId: req.id,
          score: scenario.score,
          riskLevel: scenario.riskLevel,
          positiveIndicatorsJson: scenario.doctorStatus === "VALIDATED" ? ["Médico identificado confirmado junto ao conselho de classe."] : [],
          negativeIndicatorsJson: scenario.clinicStatus === "NOT_FOUND" ? ["Clínica/hospital não localizado na fonte consultada."] : [],
          summary: summaryFor(scenario),
        },
      });

      if (scenario.clinicStatus === "NOT_FOUND") {
        await prisma.riskAlert.create({
          data: {
            riskAnalysisId: riskAnalysis.id,
            type: "CLINIC_NOT_FOUND",
            severity: "MEDIUM",
            title: "Clínica não localizada",
            description: "Não foi possível localizar a clínica/hospital informado na fonte de consulta.",
            isClientVisible: true,
          },
        });
      }
      if (scenario.doctorStatus === "DIVERGENT") {
        await prisma.riskAlert.create({
          data: {
            riskAnalysisId: riskAnalysis.id,
            type: "DOCTOR_NAME_DIVERGENT",
            severity: "HIGH",
            title: "Dados do médico divergentes",
            description: "O nome informado no atestado diverge do registro oficial encontrado.",
            isClientVisible: true,
          },
        });
      }
      if (scenario.qrStatus === "DOMAIN_SUSPICIOUS" || scenario.qrStatus === "DATA_MISMATCH") {
        await prisma.riskAlert.create({
          data: {
            riskAnalysisId: riskAnalysis.id,
            type: scenario.qrStatus === "DOMAIN_SUSPICIOUS" ? "QR_CODE_DOMAIN_SUSPICIOUS" : "AUTHENTICATION_DATA_MISMATCH",
            severity: "HIGH",
            title: scenario.qrStatus === "DOMAIN_SUSPICIOUS" ? "Domínio não reconhecido" : "Divergência na autenticação",
            description: "Indício identificado na verificação do código de autenticação do documento.",
            isClientVisible: true,
          },
        });
      }
      await prisma.requestTimelineEvent.create({
        data: { requestId: req.id, eventType: "RISK_SCORE_CALCULATED", title: "Score de confiabilidade calculado", description: summaryFor(scenario), isClientVisible: true, createdAt },
      });
    }

    if (scenario.hasContact) {
      const result = scenario.status === "NOT_RECOGNIZED_BY_INSTITUTION" ? "DENIED_ISSUANCE" : scenario.finalResult === "VALIDATED" || scenario.finalResult === "VALIDATED_WITH_REMARKS" ? "CONFIRMED_ISSUANCE" : "NO_RESPONSE";
      await prisma.contactAttempt.create({
        data: {
          requestId: req.id,
          contactType: "PHONE",
          contactTarget: clinic.name,
          contactValue: clinic.phone,
          attemptedAt: daysAgo(20 - requestCounter - 1),
          responsibleUserId: (scenario.assignedTo ?? analyst1).id,
          contactedPersonName: "Atendimento",
          contactedPersonRole: "Recepção",
          result,
          notes: result === "DENIED_ISSUANCE" ? "Instituição informou não haver registro de emissão deste atestado." : result === "CONFIRMED_ISSUANCE" ? "Instituição confirmou a emissão do documento." : "Sem retorno até o momento.",
          isClientVisible: true,
        },
      });
      await prisma.requestTimelineEvent.create({
        data: { requestId: req.id, eventType: "CONTACT_ATTEMPT_REGISTERED", title: "Contato com a clínica registrado", isClientVisible: true, createdAt: daysAgo(20 - requestCounter - 1) },
      });
    }

    if (scenario.hasWhatsApp) {
      await prisma.whatsAppMessage.create({
        data: {
          organizationId: scenario.org.id,
          requestId: req.id,
          direction: "OUTBOUND",
          fromNumber: "medcheck-sandbox",
          toNumber: "+55 11 90000-0000",
          templateName: "request_received",
          messageBody: `Olá, sua solicitação de validação #${req.id.slice(-8)} foi recebida e está em processamento. Você pode acompanhar o status no painel MedCheck.`,
          status: "DELIVERED",
          sentAt: createdAt,
          deliveredAt: createdAt,
        },
      });
    }

    if (scenario.finalResult) {
      const generatedBy = scenario.supervisorUser ?? scenario.assignedTo ?? analyst1;
      const approvedBy = scenario.supervisorUser ?? generatedBy;
      await prisma.finalReport.create({
        data: {
          requestId: req.id,
          result: scenario.finalResult,
          confidenceScore: scenario.score ?? 50,
          riskLevel: scenario.riskLevel ?? "MEDIUM",
          executiveSummary: executiveSummaryFor(scenario),
          methodsUsedJson: { ocr: true, doctorVerification: true, clinicVerification: true, qrCodeVerification: scenario.qrStatus !== "NOT_PRESENT", technicalAnalysis: true },
          verifiedDataJson: { doctor: { status: scenario.doctorStatus }, clinic: { status: scenario.clinicStatus } },
          evidenceSummaryJson: { contactAttempts: scenario.hasContact ? 1 : 0 },
          clientVisibleNotes: clientSummaryFor(scenario.finalResult),
          generatedByUserId: generatedBy.id,
          approvedByUserId: approvedBy.id,
          approvedAt: completedAt,
          generatedAt: completedAt ?? createdAt,
        },
      });
      await prisma.requestTimelineEvent.create({
        data: { requestId: req.id, eventType: "FINAL_REPORT_GENERATED", title: "Parecer final emitido", isClientVisible: true, createdAt: completedAt ?? createdAt },
      });
      await prisma.requestTimelineEvent.create({
        data: { requestId: req.id, eventType: "REQUEST_COMPLETED", title: "Solicitação concluída", isClientVisible: true, createdAt: completedAt ?? createdAt },
      });

      if (scenario.hasDispute) {
        const dispute = await prisma.dispute.create({
          data: {
            requestId: req.id,
            openedByUserId: submittedBy.id,
            reason: "discordo_resultado",
            description: "A empresa possui documentação complementar que julga relevante para a revisão do caso.",
            status: "OPEN",
            assignedToUserId: supervisor.id,
            createdAt: daysAgo(1),
          },
        });
        await prisma.requestTimelineEvent.create({
          data: { requestId: req.id, eventType: "REQUEST_CONTESTED", title: "Contestação aberta pelo cliente", description: dispute.description, isClientVisible: true, createdAt: daysAgo(1) },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        organizationId: scenario.org.id,
        userId: submittedBy.id,
        requestId: req.id,
        action: "REQUEST_CREATED",
        entityType: "MedicalCertificateRequest",
        entityId: req.id,
        newDataJson: { employeeName: scenario.employee },
        createdAt,
      },
    });
  }

  console.log("Seed completed.");
  console.log("---");
  console.log("Demo credentials (password: password123):");
  console.log(`  Super Admin:        ${superAdmin.email}`);
  console.log(`  Internal Admin:     ${internalAdmin.email}`);
  console.log(`  Supervisor:         ${supervisor.email}`);
  console.log(`  Analyst 1:          ${analyst1.email}`);
  console.log(`  Analyst 2:          ${analyst2.email}`);
  console.log(`  Client Admin (A):   ${clientAdminA.email}`);
  console.log(`  Client User (A):    ${clientUserA1.email}`);
  console.log(`  Client Admin (B):   ${clientAdminB.email}`);
  console.log(`  Client User (B):    ${clientUserB1.email}`);
}

function summaryFor(scenario: { riskLevel: RiskLevel | null }) {
  switch (scenario.riskLevel) {
    case "VERY_LOW":
    case "LOW":
      return "Médico e instituição emissora confirmados, sem indícios relevantes.";
    case "MEDIUM":
      return "Confiabilidade média — caso encaminhado para revisão humana.";
    case "HIGH":
      return "Indícios relevantes de inconsistência — recomenda-se contato com a instituição.";
    case "CRITICAL":
      return "Indícios críticos identificados — caso encaminhado para revisão de supervisor.";
    default:
      return "Análise em andamento.";
  }
}

function executiveSummaryFor(scenario: { finalResult: FinalResult | null; doctorStatus: string; clinicStatus: string }) {
  switch (scenario.finalResult) {
    case "VALIDATED":
      return "O médico e a instituição emissora foram confirmados junto às fontes consultadas, sem indícios de inconsistência.";
    case "VALIDATED_WITH_REMARKS":
      return "O documento foi confirmado, porém identificamos divergências pontuais que constam como ressalva neste parecer.";
    case "INCONCLUSIVE":
      return "Não foi possível reunir dados suficientes para uma conclusão definitiva neste momento.";
    case "INCONSISTENT":
      return "Foram identificados indícios relevantes de inconsistência entre os dados do documento e as fontes consultadas.";
    case "NOT_CONFIRMED":
      return "Não foi possível confirmar os dados do documento junto às fontes disponíveis.";
    case "NOT_RECOGNIZED_BY_INSTITUTION":
      return "A instituição emissora informada não reconheceu a emissão deste documento quando contatada.";
    default:
      return "Análise concluída.";
  }
}

function clientSummaryFor(result: FinalResult) {
  switch (result) {
    case "VALIDATED":
      return "Documento confirmado pela instituição emissora.";
    case "VALIDATED_WITH_REMARKS":
      return "Documento confirmado, com ressalvas descritas no parecer.";
    case "INCONCLUSIVE":
      return "Validação inconclusiva — dados insuficientes para uma conclusão.";
    case "INCONSISTENT":
      return "Foram identificados indícios de inconsistência no documento.";
    case "NOT_CONFIRMED":
      return "Não foi possível confirmar o documento junto às fontes consultadas.";
    case "NOT_RECOGNIZED_BY_INSTITUTION":
      return "A instituição emissora não reconheceu a emissão deste documento.";
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
