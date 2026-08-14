import { prisma } from "@/lib/prisma";
import { storageAdapter } from "./storage.service";
import { recordAuditLog } from "@/server/audit";
import { namesLooselyMatch } from "@/lib/fuzzy-match";

const ANONYMIZED_NAME = "[Titular anonimizado]";

/**
 * Shared by both the ambient retention cron (src/app/api/cron/retention)
 * and the on-demand DataPrivacyRequest flow (a subject's own LGPD
 * deletion/anonymization request) — same real operations, two different
 * triggers (a date passing vs. someone asking).
 */

/** A masked document (e.g. "***.879.***-94") can't uniquely identify someone on its own, so this also requires the name to loosely match — avoids anonymizing the wrong employee's record on a mask collision. */
export async function findMatchingRequests(
  organizationId: string,
  subjectName: string,
  subjectDocumentMasked: string,
): Promise<{ id: string; employeeName: string }[]> {
  const candidates = await prisma.medicalCertificateRequest.findMany({
    where: { organizationId, employeeDocumentMasked: subjectDocumentMasked },
    select: { id: true, employeeName: true },
  });
  return candidates.filter((c) => namesLooselyMatch(subjectName, c.employeeName));
}

/**
 * Nulls the PII that identifies the certificate's subject and the
 * doctor/clinic named in it — rawText, names, contact details. Deliberately
 * keeps status/matchScore/CRM/CNPJ/dates: professional registry numbers and
 * aggregate outcome data aren't the data subject's personal data, and
 * keeping them lets the retained (now-anonymous) record still answer "how
 * many requests were validated" without answering "whose".
 */
export async function anonymizeRequests(organizationId: string, requestIds: string[], auditAction = "DATA_RETENTION_ANONYMIZED"): Promise<number> {
  const now = new Date();
  let count = 0;
  for (const requestId of requestIds) {
    const request = await prisma.medicalCertificateRequest.findUnique({ where: { id: requestId }, select: { anonymizedAt: true } });
    if (!request || request.anonymizedAt) continue; // already anonymized — idempotent

    await prisma.$transaction([
      prisma.medicalCertificateRequest.update({
        where: { id: requestId },
        data: { employeeName: ANONYMIZED_NAME, employeeRegistration: null, employeeEmail: null, anonymizedAt: now },
      }),
      prisma.extractedData.updateMany({
        where: { requestId },
        data: {
          rawText: null,
          doctorName: null,
          clinicAddress: null,
          clinicPhone: null,
          clinicEmail: null,
          cidCode: null,
          qrCodeContent: null,
          authenticationUrl: null,
        },
      }),
      prisma.doctorVerification.updateMany({
        where: { requestId },
        data: { informedDoctorName: null, officialDoctorName: null },
      }),
      prisma.clinicVerification.updateMany({
        where: { requestId },
        data: {
          informedClinicName: null,
          officialName: null,
          informedAddress: null,
          officialAddress: null,
          informedPhone: null,
          officialPhone: null,
          informedEmail: null,
          officialEmail: null,
        },
      }),
    ]);

    await recordAuditLog({ organizationId, requestId, action: auditAction, entityType: "MedicalCertificateRequest", entityId: requestId });
    count++;
  }
  return count;
}

/** Removes the actual Storage objects (not just DB rows) and marks each DocumentFile with `deletedAt` as a tombstone. */
export async function deleteRequestFiles(organizationId: string, requestIds: string[], auditAction = "DATA_RETENTION_FILES_PURGED"): Promise<number> {
  const now = new Date();
  let count = 0;
  for (const requestId of requestIds) {
    const docs = await prisma.documentFile.findMany({ where: { requestId, deletedAt: null } });
    if (docs.length === 0) continue;
    for (const doc of docs) {
      await storageAdapter.remove(doc.storageBucket, doc.storagePath);
      await prisma.documentFile.update({ where: { id: doc.id }, data: { deletedAt: now } });
      count++;
    }
    await recordAuditLog({
      organizationId,
      requestId,
      action: auditAction,
      entityType: "MedicalCertificateRequest",
      entityId: requestId,
      newData: { filesPurged: docs.length },
    });
  }
  return count;
}

/** Builds a portable JSON export of everything on file for the matched requests — the real substance of an LGPD access/portability request, not just a status toggle. */
export async function exportRequestsData(requestIds: string[]) {
  const requests = await prisma.medicalCertificateRequest.findMany({
    where: { id: { in: requestIds } },
    include: {
      extractedData: true,
      doctorVerification: true,
      clinicVerification: true,
      qrCodeVerification: true,
      technicalAnalysis: true,
      riskAnalysis: { include: { alerts: true } },
      contactAttempts: true,
      finalReport: true,
    },
  });
  return requests;
}
