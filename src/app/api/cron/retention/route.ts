import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageAdapter } from "@/server/services/storage.service";
import { recordAuditLog } from "@/server/audit";

const ANONYMIZED_NAME = "[Titular anonimizado]";

/**
 * Enforces the DataRetentionPolicy an organization configured at
 * /admin/retention — until this route existed, `retentionDays`/
 * `autoAnonymize`/`autoDeleteFiles` were stored but never acted on: a
 * client could set "delete after 90 days" and nothing would ever happen.
 * For a product whose value proposition is handling health-adjacent data
 * responsibly, that gap is a compliance liability, not just an unfinished
 * feature — this closes it.
 *
 * Triggered by Vercel Cron (see vercel.json). Idempotent: only acts on
 * requests past `retentionUntil` that haven't already been processed
 * (`anonymizedAt` / `DocumentFile.deletedAt`), so re-running (a retry, a
 * manual invocation) never double-anonymizes or double-deletes.
 */
export async function GET(request: Request) {
  const authError = checkCronAuth(request);
  if (authError) return authError;

  const now = new Date();
  const organizations = await prisma.organization.findMany({ include: { dataRetentionPolicy: true } });

  let anonymizedCount = 0;
  let filesPurgedCount = 0;

  for (const org of organizations) {
    const policy = org.dataRetentionPolicy;
    if (!policy) continue;

    if (policy.autoAnonymize) {
      const due = await prisma.medicalCertificateRequest.findMany({
        where: { organizationId: org.id, retentionUntil: { lt: now }, anonymizedAt: null },
        select: { id: true },
      });
      for (const r of due) {
        await anonymizeRequest(org.id, r.id, now);
        anonymizedCount++;
      }
    }

    if (policy.autoDeleteFiles) {
      const due = await prisma.medicalCertificateRequest.findMany({
        where: { organizationId: org.id, retentionUntil: { lt: now } },
        select: { id: true, documents: { where: { deletedAt: null }, select: { id: true, storageBucket: true, storagePath: true } } },
      });
      for (const r of due) {
        if (r.documents.length === 0) continue;
        for (const doc of r.documents) {
          await storageAdapter.remove(doc.storageBucket, doc.storagePath);
          await prisma.documentFile.update({ where: { id: doc.id }, data: { deletedAt: now } });
          filesPurgedCount++;
        }
        await recordAuditLog({
          organizationId: org.id,
          requestId: r.id,
          action: "DATA_RETENTION_FILES_PURGED",
          entityType: "MedicalCertificateRequest",
          entityId: r.id,
          newData: { filesPurged: r.documents.length },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, anonymizedCount, filesPurgedCount, ranAt: now.toISOString() });
}

function checkCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret) {
    if (authHeader !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return null;
  }
  // No secret configured: fine for local dev, but an unauthenticated
  // data-deletion endpoint must never sit exposed in production.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  }
  return null;
}

/**
 * Nulls the PII that identifies the certificate's subject and the
 * doctor/clinic named in it — rawText, names, contact details. Deliberately
 * keeps status/matchScore/CRM/CNPJ/dates: professional registry numbers and
 * aggregate outcome data aren't the data subject's personal data, and
 * keeping them lets the retained (now-anonymous) record still answer "how
 * many requests were validated" without answering "whose".
 */
async function anonymizeRequest(organizationId: string, requestId: string, now: Date) {
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

  await recordAuditLog({
    organizationId,
    requestId,
    action: "DATA_RETENTION_ANONYMIZED",
    entityType: "MedicalCertificateRequest",
    entityId: requestId,
  });
}
