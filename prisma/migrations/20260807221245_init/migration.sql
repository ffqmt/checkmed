-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'INTERNAL_ADMIN', 'INTERNAL_SUPERVISOR', 'INTERNAL_ANALYST', 'CLIENT_ADMIN', 'CLIENT_USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'INVITED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SubmissionChannel" AS ENUM ('WEB_UPLOAD', 'API', 'EMAIL', 'WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'OCR_RUNNING', 'OCR_COMPLETED', 'DATA_EXTRACTED', 'AUTO_VALIDATION_RUNNING', 'WAITING_HUMAN_REVIEW', 'MANUAL_REVIEW', 'WAITING_CLINIC_CONTACT', 'CLINIC_CONTACTED', 'WAITING_EXTERNAL_RESPONSE', 'SUPERVISOR_REVIEW', 'FINAL_REPORT_READY', 'VALIDATED', 'VALIDATED_WITH_REMARKS', 'INCONCLUSIVE', 'INCONSISTENT', 'NOT_CONFIRMED', 'NOT_RECOGNIZED_BY_INSTITUTION', 'CANCELLED', 'EXPIRED', 'CONTESTED', 'REOPENED');

-- CreateEnum
CREATE TYPE "FinalResult" AS ENUM ('VALIDATED', 'VALIDATED_WITH_REMARKS', 'INCONCLUSIVE', 'INCONSISTENT', 'NOT_CONFIRMED', 'NOT_RECOGNIZED_BY_INSTITUTION');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'JPG', 'JPEG', 'PNG');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VALIDATED', 'NOT_FOUND', 'DIVERGENT', 'INCONCLUSIVE', 'QUERY_ERROR');

-- CreateEnum
CREATE TYPE "QrCodeStatus" AS ENUM ('NOT_PRESENT', 'PENDING', 'VALID', 'INVALID', 'UNREACHABLE', 'DOMAIN_SUSPICIOUS', 'DATA_MISMATCH', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "TechnicalAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'INCONCLUSIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "SimilarityMatchType" AS ENUM ('EXACT_FILE_HASH', 'VISUAL_SIMILARITY', 'TEXT_SIMILARITY', 'STAMP_SIMILARITY', 'SIGNATURE_SIMILARITY', 'LAYOUT_SIMILARITY');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskAlertType" AS ENUM ('CRM_NOT_FOUND', 'DOCTOR_NAME_DIVERGENT', 'CRM_UF_DIVERGENT', 'CLINIC_NOT_FOUND', 'CLINIC_DATA_DIVERGENT', 'PHONE_INVALID', 'QR_CODE_INVALID', 'QR_CODE_DOMAIN_SUSPICIOUS', 'AUTHENTICATION_DATA_MISMATCH', 'FUTURE_ISSUE_DATE', 'ABSENCE_PERIOD_INCONSISTENT', 'METADATA_SUSPICIOUS', 'PDF_LAYER_SUSPICIOUS', 'FONT_INCONSISTENCY', 'IMAGE_COMPRESSION_INCONSISTENCY', 'STAMP_SIGNATURE_INCONSISTENCY', 'POSSIBLE_AI_GENERATION', 'SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT', 'INSUFFICIENT_INFORMATION', 'LOW_OCR_CONFIDENCE', 'CLINIC_CONFIRMATION_REQUIRED', 'MANUAL_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('PHONE', 'EMAIL', 'WHATSAPP', 'PORTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactResult" AS ENUM ('CONFIRMED_ISSUANCE', 'DENIED_ISSUANCE', 'NOT_FOUND', 'REQUESTED_PATIENT_AUTHORIZATION', 'NO_RESPONSE', 'INVALID_CONTACT', 'CALL_BACK_LATER', 'OTHER');

-- CreateEnum
CREATE TYPE "WhatsAppProvider" AS ENUM ('META_CLOUD_API', 'ZAPI', 'TWILIO', 'OTHER');

-- CreateEnum
CREATE TYPE "WhatsAppIntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING_SETUP');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WebhookEndpointStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FAILING');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('REQUEST_CREATED', 'FILE_UPLOADED', 'FILE_HASH_CALCULATED', 'OCR_STARTED', 'OCR_COMPLETED', 'DATA_EXTRACTED', 'DOCTOR_VERIFICATION_STARTED', 'DOCTOR_VERIFICATION_COMPLETED', 'CLINIC_VERIFICATION_STARTED', 'CLINIC_VERIFICATION_COMPLETED', 'QR_CODE_VERIFICATION_COMPLETED', 'TECHNICAL_ANALYSIS_COMPLETED', 'FINGERPRINT_GENERATED', 'SIMILARITY_CHECK_COMPLETED', 'RISK_SCORE_CALCULATED', 'STATUS_CHANGED', 'CONTACT_ATTEMPT_REGISTERED', 'WHATSAPP_MESSAGE_SENT', 'EMAIL_SENT', 'HUMAN_REVIEW_STARTED', 'SUPERVISOR_REVIEW_STARTED', 'FINAL_REPORT_GENERATED', 'REQUEST_COMPLETED', 'REQUEST_CONTESTED', 'REQUEST_REOPENED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'WAITING_ADDITIONAL_INFORMATION', 'RESOLVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataPrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'ANONYMIZATION', 'DELETION', 'EXPORT');

-- CreateEnum
CREATE TYPE "DataPrivacyRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL',
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 365,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "supervisorUserId" TEXT,
    "employeeName" TEXT NOT NULL,
    "employeeDocumentMasked" TEXT NOT NULL,
    "employeeRegistration" TEXT,
    "employeeEmail" TEXT,
    "receivedByCompanyAt" TIMESTAMP(3) NOT NULL,
    "submissionChannel" "SubmissionChannel" NOT NULL DEFAULT 'WEB_UPLOAD',
    "status" "RequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "priority" "RequestPriority" NOT NULL DEFAULT 'NORMAL',
    "slaDueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalResult" "FinalResult",
    "confidenceScore" INTEGER,
    "riskLevel" "RiskLevel",
    "clientVisibleSummary" TEXT,
    "internalNotes" TEXT,
    "consentOrLegalBasis" TEXT NOT NULL,
    "treatmentPurpose" TEXT NOT NULL,
    "retentionUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "perceptualHash" TEXT,
    "visualFingerprint" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "metadataJson" JSONB,
    "pageCount" INTEGER,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_data" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "rawText" TEXT,
    "doctorName" TEXT,
    "doctorCrm" TEXT,
    "doctorCrmUf" TEXT,
    "certificateIssueDate" TIMESTAMP(3),
    "absenceDays" INTEGER,
    "absenceStartDate" TIMESTAMP(3),
    "absenceEndDate" TIMESTAMP(3),
    "clinicName" TEXT,
    "clinicCnpj" TEXT,
    "clinicCnes" TEXT,
    "clinicAddress" TEXT,
    "clinicPhone" TEXT,
    "clinicEmail" TEXT,
    "cidCode" TEXT,
    "qrCodeContent" TEXT,
    "authenticationUrl" TEXT,
    "confidenceJson" JSONB,
    "extractionWarningsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_verifications" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "informedDoctorName" TEXT,
    "informedCrm" TEXT,
    "informedCrmUf" TEXT,
    "officialDoctorName" TEXT,
    "officialCrm" TEXT,
    "officialCrmUf" TEXT,
    "registrationStatus" TEXT,
    "specialty" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "matchScore" INTEGER,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "checkedAt" TIMESTAMP(3),
    "rawResponseJson" JSONB,
    "notes" TEXT,

    CONSTRAINT "doctor_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_verifications" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "informedClinicName" TEXT,
    "informedCnpj" TEXT,
    "informedCnes" TEXT,
    "informedAddress" TEXT,
    "informedPhone" TEXT,
    "informedEmail" TEXT,
    "officialName" TEXT,
    "officialCnpj" TEXT,
    "officialCnes" TEXT,
    "officialAddress" TEXT,
    "officialPhone" TEXT,
    "officialEmail" TEXT,
    "website" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "matchScore" INTEGER,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "checkedAt" TIMESTAMP(3),
    "rawResponseJson" JSONB,
    "notes" TEXT,

    CONSTRAINT "clinic_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_code_verifications" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "qrCodeContent" TEXT,
    "authenticationUrl" TEXT,
    "domain" TEXT,
    "isDomainTrusted" BOOLEAN,
    "httpStatus" INTEGER,
    "extractedPageDataJson" JSONB,
    "screenshotEvidenceFileId" TEXT,
    "matchScore" INTEGER,
    "status" "QrCodeStatus" NOT NULL DEFAULT 'NOT_PRESENT',
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "qr_code_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technical_analyses" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "metadataRiskScore" INTEGER,
    "manipulationRiskScore" INTEGER,
    "aiGenerationRiskScore" INTEGER,
    "compressionInconsistencyScore" INTEGER,
    "fontInconsistencyScore" INTEGER,
    "layerInconsistencyScore" INTEGER,
    "signatureStampInconsistencyScore" INTEGER,
    "findingsJson" JSONB,
    "status" "TechnicalAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "analyzedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "technical_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_fingerprints" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "perceptualHash" TEXT,
    "layoutHash" TEXT,
    "textHash" TEXT,
    "stampHash" TEXT,
    "signatureHash" TEXT,
    "normalizedText" TEXT,
    "similarityGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_fingerprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similarity_matches" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "matchedRequestId" TEXT NOT NULL,
    "matchType" "SimilarityMatchType" NOT NULL,
    "similarityScore" INTEGER NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similarity_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_analyses" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "positiveIndicatorsJson" JSONB,
    "negativeIndicatorsJson" JSONB,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_alerts" (
    "id" TEXT NOT NULL,
    "riskAnalysisId" TEXT NOT NULL,
    "type" "RiskAlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_attempts" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "contactType" "ContactType" NOT NULL,
    "contactTarget" TEXT NOT NULL,
    "contactValue" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL,
    "responsibleUserId" TEXT NOT NULL,
    "contactedPersonName" TEXT,
    "contactedPersonRole" TEXT,
    "result" "ContactResult" NOT NULL,
    "notes" TEXT,
    "evidenceFileId" TEXT,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "WhatsAppProvider" NOT NULL,
    "phoneNumberId" TEXT,
    "businessAccountId" TEXT,
    "accessTokenEncrypted" TEXT,
    "webhookVerifyToken" TEXT,
    "status" "WhatsAppIntegrationStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestId" TEXT,
    "direction" "WhatsAppDirection" NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "templateName" TEXT,
    "messageBody" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "requestId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "notifyOnRequestReceived" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnProcessingStarted" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnWaitingExternalResponse" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnCompleted" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnInconsistency" BOOLEAN NOT NULL DEFAULT true,
    "channelsJson" JSONB,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventsJson" JSONB NOT NULL,
    "status" "WebhookEndpointStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookEndpointId" TEXT NOT NULL,
    "requestId" TEXT,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_timeline_events" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "requestId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousDataJson" JSONB,
    "newDataJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "final_reports" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "result" "FinalResult" NOT NULL,
    "confidenceScore" INTEGER NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "methodsUsedJson" JSONB NOT NULL,
    "verifiedDataJson" JSONB NOT NULL,
    "evidenceSummaryJson" JSONB NOT NULL,
    "limitations" TEXT,
    "clientVisibleNotes" TEXT,
    "internalNotes" TEXT,
    "generatedByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "pdfStoragePath" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "final_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "openedByUserId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "assignedToUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_retention_policies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "autoAnonymize" BOOLEAN NOT NULL DEFAULT false,
    "autoDeleteFiles" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_retention_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_privacy_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestType" "DataPrivacyRequestType" NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectDocumentMasked" TEXT NOT NULL,
    "status" "DataPrivacyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "data_privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_cnpj_key" ON "organizations"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "certificate_requests_organizationId_idx" ON "certificate_requests"("organizationId");

-- CreateIndex
CREATE INDEX "certificate_requests_status_idx" ON "certificate_requests"("status");

-- CreateIndex
CREATE INDEX "certificate_requests_assignedToUserId_idx" ON "certificate_requests"("assignedToUserId");

-- CreateIndex
CREATE INDEX "document_files_requestId_idx" ON "document_files"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_data_requestId_key" ON "extracted_data"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_verifications_requestId_key" ON "doctor_verifications"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_verifications_requestId_key" ON "clinic_verifications"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "qr_code_verifications_requestId_key" ON "qr_code_verifications"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "technical_analyses_requestId_key" ON "technical_analyses"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "document_fingerprints_requestId_key" ON "document_fingerprints"("requestId");

-- CreateIndex
CREATE INDEX "document_fingerprints_similarityGroupId_idx" ON "document_fingerprints"("similarityGroupId");

-- CreateIndex
CREATE INDEX "similarity_matches_requestId_idx" ON "similarity_matches"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "risk_analyses_requestId_key" ON "risk_analyses"("requestId");

-- CreateIndex
CREATE INDEX "risk_alerts_riskAnalysisId_idx" ON "risk_alerts"("riskAnalysisId");

-- CreateIndex
CREATE INDEX "contact_attempts_requestId_idx" ON "contact_attempts"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_integrations_organizationId_key" ON "whatsapp_integrations"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_organizationId_idx" ON "whatsapp_messages"("organizationId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_requestId_idx" ON "whatsapp_messages"("requestId");

-- CreateIndex
CREATE INDEX "notifications_organizationId_idx" ON "notifications"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_organizationId_userId_key" ON "notification_preferences"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE INDEX "webhook_endpoints_organizationId_idx" ON "webhook_endpoints"("organizationId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookEndpointId_idx" ON "webhook_deliveries"("webhookEndpointId");

-- CreateIndex
CREATE INDEX "request_timeline_events_requestId_idx" ON "request_timeline_events"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_idx" ON "audit_logs"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "final_reports_requestId_key" ON "final_reports"("requestId");

-- CreateIndex
CREATE INDEX "disputes_requestId_idx" ON "disputes"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "data_retention_policies_organizationId_key" ON "data_retention_policies"("organizationId");

-- CreateIndex
CREATE INDEX "data_privacy_requests_organizationId_idx" ON "data_privacy_requests"("organizationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_requests" ADD CONSTRAINT "certificate_requests_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_verifications" ADD CONSTRAINT "doctor_verifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_verifications" ADD CONSTRAINT "clinic_verifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_code_verifications" ADD CONSTRAINT "qr_code_verifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technical_analyses" ADD CONSTRAINT "technical_analyses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_fingerprints" ADD CONSTRAINT "document_fingerprints_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "similarity_matches" ADD CONSTRAINT "similarity_matches_matchedRequestId_fkey" FOREIGN KEY ("matchedRequestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_analyses" ADD CONSTRAINT "risk_analyses_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_alerts" ADD CONSTRAINT "risk_alerts_riskAnalysisId_fkey" FOREIGN KEY ("riskAnalysisId") REFERENCES "risk_analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_integrations" ADD CONSTRAINT "whatsapp_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "webhook_endpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_timeline_events" ADD CONSTRAINT "request_timeline_events_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_timeline_events" ADD CONSTRAINT "request_timeline_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "final_reports" ADD CONSTRAINT "final_reports_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "certificate_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedByUserId_fkey" FOREIGN KEY ("openedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_retention_policies" ADD CONSTRAINT "data_retention_policies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_privacy_requests" ADD CONSTRAINT "data_privacy_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_privacy_requests" ADD CONSTRAINT "data_privacy_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
