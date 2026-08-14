import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anonymizeRequests, deleteRequestFiles } from "@/server/services/data-privacy.service";

/**
 * Enforces the DataRetentionPolicy an organization configured at
 * /admin/retention — until this route existed, `retentionDays`/
 * `autoAnonymize`/`autoDeleteFiles` were stored but never acted on: a
 * client could set "delete after 90 days" and nothing would ever happen.
 * For a product whose value proposition is handling health-adjacent data
 * responsibly, that gap is a compliance liability, not just an unfinished
 * feature — this closes it.
 *
 * Triggered by Vercel Cron (see vercel.json). The actual anonymize/delete
 * operations live in data-privacy.service.ts, shared with the on-demand
 * DataPrivacyRequest flow — same real work, two different triggers.
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
      anonymizedCount += await anonymizeRequests(org.id, due.map((r) => r.id));
    }

    if (policy.autoDeleteFiles) {
      const due = await prisma.medicalCertificateRequest.findMany({
        where: { organizationId: org.id, retentionUntil: { lt: now } },
        select: { id: true },
      });
      filesPurgedCount += await deleteRequestFiles(org.id, due.map((r) => r.id));
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
