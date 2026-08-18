import type { RiskAlertType, Prisma } from "@prisma/client";

/**
 * Shared result types for the document-validation service layer. Every
 * service below ships a MOCK implementation with realistic, randomized
 * output so the workflow can be exercised end-to-end without live
 * integrations. Swap the mock for a real adapter behind the same interface
 * — call sites never change.
 */

export type OcrResult = {
  rawText: string;
  confidence: number; // 0-100
  warnings: string[];
};

export type ExtractedMedicalCertificateData = {
  doctorName: string | null;
  doctorCrm: string | null;
  doctorCrmUf: string | null;
  certificateIssueDate: Date | null;
  absenceDays: number | null;
  absenceStartDate: Date | null;
  absenceEndDate: Date | null;
  clinicName: string | null;
  clinicCnpj: string | null;
  clinicCnes: string | null;
  clinicAddress: string | null;
  clinicPhone: string | null;
  clinicEmail: string | null;
  cidCode: string | null;
  qrCodeContent: string | null;
  authenticationUrl: string | null;
  confidence: Record<string, number>;
  warnings: string[];
};

export type DoctorVerificationResult = {
  officialDoctorName: string | null;
  officialCrm: string | null;
  officialCrmUf: string | null;
  registrationStatus: string | null;
  specialty: string | null;
  sourceName: string;
  sourceUrl: string | null;
  matchScore: number;
  status: "VALIDATED" | "NOT_FOUND" | "DIVERGENT" | "INCONCLUSIVE" | "QUERY_ERROR";
  rawResponse: Record<string, Prisma.InputJsonValue | null>;
  notes: string | null;
};

export type ClinicVerificationInput = {
  clinicName: string | null;
  cnpj: string | null;
  cnes: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

export type ClinicVerificationResult = {
  officialName: string | null;
  officialCnpj: string | null;
  officialCnes: string | null;
  officialAddress: string | null;
  officialPhone: string | null;
  officialEmail: string | null;
  website: string | null;
  sourceName: string;
  sourceUrl: string | null;
  matchScore: number;
  status: "VALIDATED" | "NOT_FOUND" | "DIVERGENT" | "INCONCLUSIVE" | "QUERY_ERROR";
  rawResponse: Record<string, Prisma.InputJsonValue | null>;
  notes: string | null;
};

export type QrCodeDetectionResult = {
  found: boolean;
  content: string | null;
};

export type QrCodeUrlValidationResult = {
  domain: string | null;
  isDomainTrusted: boolean;
  httpStatus: number | null;
  reachable: boolean;
  extractedPageData: Record<string, Prisma.InputJsonValue> | null;
};

export type QrCodeVerificationOutcome = {
  status:
    | "NOT_PRESENT"
    | "VALID"
    | "INVALID"
    | "UNREACHABLE"
    | "DOMAIN_SUSPICIOUS"
    | "DATA_MISMATCH"
    | "INCONCLUSIVE";
  matchScore: number | null;
  notes: string | null;
};

export type TechnicalFindings = {
  metadataRiskScore: number;
  manipulationRiskScore: number;
  aiGenerationRiskScore: number;
  compressionInconsistencyScore: number;
  fontInconsistencyScore: number;
  layerInconsistencyScore: number;
  signatureStampInconsistencyScore: number;
  /** Phase 3: content-based red flags read from the document's own text/layout by a vision-capable LLM (e.g. an unfilled signature/CRM field, a malformed CPF, generic template boilerplate) — distinct from the pixel/metadata signals above. 0 when the extraction step didn't run a real provider. */
  contentAuthenticityRiskScore: number;
  findings: Array<{ area: string; description: string; severity: "info" | "low" | "medium" | "high" }>;
  status: "COMPLETED" | "INCONCLUSIVE" | "ERROR";
  /** Set when a Phase 2 external vendor (e.g. Sightengine) actually answered — null when only the free metadata heuristic ran. */
  externalProviderName: string | null;
  externalProviderResponseJson: Record<string, Prisma.InputJsonValue> | null;
};

/** Phase 3: real document-intelligence result — one vision-model pass that both transcribes the document and extracts structured fields, so extraction is grounded in the actual uploaded file instead of a canned template. */
export type DocumentIntelligenceResult = {
  ocr: OcrResult;
  extraction: ExtractedMedicalCertificateData;
  contentAuthenticityRiskScore: number;
  contentFindings: Array<{ area: string; description: string; severity: "info" | "low" | "medium" | "high" }>;
  /** Patient/employee identity fields — kept separate from `extraction` because they exist only to prefill the request form client-side and are never persisted (the app otherwise only ever stores the masked CPF). */
  patientName: string | null;
  patientCpf: string | null;
};

export type AiContentDetectionResult = {
  provider: "SIGHTENGINE" | "NONE";
  /** 0-100, higher = more likely AI-generated. Null when the provider didn't return a usable score. */
  aiGeneratedScore: number | null;
  /** 0-100, higher = more likely a deepfake (face swap/reenactment). Null when not returned or not applicable. */
  deepfakeScore: number | null;
  rawResponse: Record<string, Prisma.InputJsonValue> | null;
  status: "OK" | "NOT_CONFIGURED" | "UNSUPPORTED_FILE" | "ERROR";
  error?: string;
};

export type FingerprintResult = {
  fileHash: string;
  /** Null for PDFs — this pipeline has no PDF-to-image rasterizer to hash. */
  perceptualHash: string | null;
  /** Not computed: no bounding-box/layout data available from extraction (plain text only). See similarity.service.ts. */
  layoutHash: null;
  textHash: string;
  /** Not computed: no stamp/signature region-detection available (same limitation as forensics.service.ts's disabled pixel check). */
  stampHash: null;
  signatureHash: null;
  normalizedText: string;
};

export type SimilarityFinding = {
  matchedRequestId: string;
  matchType:
    | "EXACT_FILE_HASH"
    | "VISUAL_SIMILARITY"
    | "TEXT_SIMILARITY"
    | "STAMP_SIMILARITY"
    | "SIGNATURE_SIMILARITY"
    | "LAYOUT_SIMILARITY";
  similarityScore: number;
  explanation: string;
};

export type RiskScoringInput = {
  extractedData: {
    absenceDays: number | null;
    certificateIssueDate: Date | null;
    absenceStartDate: Date | null;
    absenceEndDate: Date | null;
  } | null;
  ocrConfidence: number | null;
  cidValidation: { code: string; valid: boolean } | null;
  doctorVerification: { status: string; matchScore: number | null } | null;
  clinicVerification: { status: string; matchScore: number | null } | null;
  qrCodeVerification: { status: string; matchScore: number | null } | null;
  technicalAnalysis: TechnicalFindings | null;
  similarityFindings: SimilarityFinding[];
  priorInconsistentMatch: boolean;
};

export type RiskScoringResult = {
  score: number;
  riskLevel: "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  positiveIndicators: string[];
  negativeIndicators: string[];
  summary: string;
  alerts: Array<{
    type: RiskAlertType;
    severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    title: string;
    description: string;
    isClientVisible: boolean;
  }>;
  recommendation:
    | "AUTO_VALIDATE"
    | "HUMAN_REVIEW"
    | "CLINIC_CONTACT"
    | "SUPERVISOR_REVIEW"
    | "INCONCLUSIVE";
};
