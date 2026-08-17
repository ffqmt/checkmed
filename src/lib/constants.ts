import type {
  RequestStatus,
  RequestPriority,
  RiskLevel,
  UserRole,
  FinalResult,
  VerificationStatus,
  QrCodeStatus,
  DisputeStatus,
  AlertSeverity,
  DataPrivacyRequestType,
  DataPrivacyRequestStatus,
  ContactType,
  ContactResult,
  WhatsAppMessageStatus,
} from "@prisma/client";

/**
 * Centralized copy for status/risk language. MedCheck never asserts fraud —
 * only confirms, fails to confirm, or flags a document for review. Keeping
 * every label here means the "no accusatory language" rule is enforced in
 * one place instead of re-derived at each call site.
 */

export const STATUS_LABELS: Record<RequestStatus, string> = {
  RECEIVED: "Recebida",
  PROCESSING: "Em processamento",
  OCR_RUNNING: "Leitura do documento",
  OCR_COMPLETED: "Leitura concluída",
  DATA_EXTRACTED: "Dados extraídos",
  AUTO_VALIDATION_RUNNING: "Validação automática",
  WAITING_HUMAN_REVIEW: "Aguardando revisão humana",
  MANUAL_REVIEW: "Em revisão manual",
  WAITING_CLINIC_CONTACT: "Aguardando contato com clínica",
  CLINIC_CONTACTED: "Clínica contatada",
  WAITING_EXTERNAL_RESPONSE: "Aguardando resposta externa",
  SUPERVISOR_REVIEW: "Em revisão de supervisor",
  FINAL_REPORT_READY: "Parecer disponível",
  VALIDATED: "Confirmado pela instituição emissora",
  VALIDATED_WITH_REMARKS: "Confirmado com ressalvas",
  INCONCLUSIVE: "Validação inconclusiva",
  INCONSISTENT: "Indício de inconsistência",
  NOT_CONFIRMED: "Documento não confirmado",
  NOT_RECOGNIZED_BY_INSTITUTION: "Não reconhecido pela instituição emissora",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
  CONTESTED: "Em contestação",
  REOPENED: "Reaberta",
};

export const STATUS_TONE: Record<
  RequestStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  RECEIVED: "neutral",
  PROCESSING: "info",
  OCR_RUNNING: "info",
  OCR_COMPLETED: "info",
  DATA_EXTRACTED: "info",
  AUTO_VALIDATION_RUNNING: "info",
  WAITING_HUMAN_REVIEW: "warning",
  MANUAL_REVIEW: "warning",
  WAITING_CLINIC_CONTACT: "warning",
  CLINIC_CONTACTED: "warning",
  WAITING_EXTERNAL_RESPONSE: "warning",
  SUPERVISOR_REVIEW: "warning",
  FINAL_REPORT_READY: "info",
  VALIDATED: "success",
  VALIDATED_WITH_REMARKS: "success",
  INCONCLUSIVE: "neutral",
  INCONSISTENT: "danger",
  NOT_CONFIRMED: "danger",
  NOT_RECOGNIZED_BY_INSTITUTION: "danger",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  CONTESTED: "warning",
  REOPENED: "warning",
};

export const FINAL_RESULT_LABELS: Record<FinalResult, string> = {
  VALIDATED: "Confirmado pela instituição emissora",
  VALIDATED_WITH_REMARKS: "Confirmado com ressalvas",
  INCONCLUSIVE: "Validação inconclusiva",
  INCONSISTENT: "Indício de inconsistência",
  NOT_CONFIRMED: "Documento não confirmado",
  NOT_RECOGNIZED_BY_INSTITUTION: "Não reconhecido pela instituição emissora",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  VERY_LOW: "Confiabilidade muito alta",
  LOW: "Confiabilidade alta",
  MEDIUM: "Confiabilidade média",
  HIGH: "Confiabilidade baixa",
  CRITICAL: "Confiabilidade crítica",
};

export const RISK_TONE: Record<
  RiskLevel,
  "success" | "info" | "warning" | "danger"
> = {
  VERY_LOW: "success",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  CRITICAL: "danger",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  PENDING: "Pendente",
  VALIDATED: "Confirmado",
  NOT_FOUND: "Não localizado",
  DIVERGENT: "Dados divergentes",
  INCONCLUSIVE: "Inconclusivo",
  QUERY_ERROR: "Erro na consulta",
};

export const QR_STATUS_LABELS: Record<QrCodeStatus, string> = {
  NOT_PRESENT: "Sem QR Code",
  PENDING: "Verificação pendente",
  VALID: "Válido",
  INVALID: "Inválido",
  UNREACHABLE: "Link inacessível",
  DOMAIN_SUSPICIOUS: "Domínio não reconhecido",
  DATA_MISMATCH: "Dados divergentes",
  INCONCLUSIVE: "Inconclusivo",
};

export const DATA_PRIVACY_REQUEST_TYPE_LABELS: Record<DataPrivacyRequestType, string> = {
  ACCESS: "Acesso aos dados",
  CORRECTION: "Correção de dados",
  ANONYMIZATION: "Anonimização",
  DELETION: "Exclusão",
  EXPORT: "Portabilidade (exportação)",
};

export const DATA_PRIVACY_REQUEST_STATUS_LABELS: Record<DataPrivacyRequestStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  REJECTED: "Rejeitada",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  PHONE: "Telefone",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
  PORTAL: "Portal",
  OTHER: "Outro",
};

export const CONTACT_RESULT_LABELS: Record<ContactResult, string> = {
  CONFIRMED_ISSUANCE: "Emissão confirmada pela instituição",
  DENIED_ISSUANCE: "Instituição não reconheceu a emissão",
  NOT_FOUND: "Contato não localizado",
  REQUESTED_PATIENT_AUTHORIZATION: "Instituição solicitou autorização do paciente",
  NO_RESPONSE: "Sem resposta da instituição",
  INVALID_CONTACT: "Canal de contato inválido",
  CALL_BACK_LATER: "Instituição solicitou novo contato posterior",
  OTHER: "Outro resultado registrado",
};

/** The CID (diagnosis) code is treated as restricted even for internal staff — Brazilian labor law generally keeps an employer from knowing the specific diagnosis behind a medical leave, only that it's medically justified. Single source for this label so the internal and client-facing views can never drift apart. */
export const CID_REDACTED_LABEL = "Restrito — dado sensível";

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Aberta",
  IN_REVIEW: "Em análise",
  WAITING_ADDITIONAL_INFORMATION: "Aguardando informações",
  RESOLVED: "Resolvida",
  REJECTED: "Indeferida",
  CANCELLED: "Cancelada",
};

export const DISPUTE_STATUS_TONE: Record<
  DisputeStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  OPEN: "warning",
  IN_REVIEW: "info",
  WAITING_ADDITIONAL_INFORMATION: "warning",
  RESOLVED: "success",
  REJECTED: "neutral",
  CANCELLED: "neutral",
};

/** The 6 native DisputeStatus values, in pipeline order — used by the disputes Kanban board and any UI that needs the full ordered set. */
export const DISPUTE_STATUS_ORDER: DisputeStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_ADDITIONAL_INFORMATION",
  "RESOLVED",
  "REJECTED",
  "CANCELLED",
];

/** Non-terminal dispute statuses — the default view for ops/client dispute queues before any filter is applied. */
export const OPEN_DISPUTE_STATUSES: DisputeStatus[] = ["OPEN", "IN_REVIEW", "WAITING_ADDITIONAL_INFORMATION"];

export const WHATSAPP_STATUS_TONE: Record<
  WhatsAppMessageStatus,
  "neutral" | "info" | "success" | "warning" | "danger"
> = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "info",
  READ: "success",
  FAILED: "danger",
  RECEIVED: "neutral",
  SIMULATED: "warning",
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  INFO: "Informativo",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Administrador",
  INTERNAL_ADMIN: "Administrador Interno",
  INTERNAL_SUPERVISOR: "Supervisor",
  INTERNAL_ANALYST: "Analista",
  CLIENT_ADMIN: "Administrador da Empresa",
  CLIENT_USER: "Usuário da Empresa",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const CLIENT_VISIBLE_STATUSES: RequestStatus[] = [
  "RECEIVED",
  "PROCESSING",
  "WAITING_HUMAN_REVIEW",
  "WAITING_CLINIC_CONTACT",
  "CLINIC_CONTACTED",
  "WAITING_EXTERNAL_RESPONSE",
  "SUPERVISOR_REVIEW",
  "FINAL_REPORT_READY",
  "VALIDATED",
  "VALIDATED_WITH_REMARKS",
  "INCONCLUSIVE",
  "INCONSISTENT",
  "NOT_CONFIRMED",
  "NOT_RECOGNIZED_BY_INSTITUTION",
  "CANCELLED",
  "EXPIRED",
  "CONTESTED",
  "REOPENED",
];

export const INTERNAL_ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "INTERNAL_ADMIN",
  "INTERNAL_SUPERVISOR",
  "INTERNAL_ANALYST",
];

export const CLIENT_ROLES: UserRole[] = ["CLIENT_ADMIN", "CLIENT_USER"];
