import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

const OPEN_STATUSES = [
  "RECEIVED",
  "PROCESSING",
  "OCR_RUNNING",
  "OCR_COMPLETED",
  "DATA_EXTRACTED",
  "AUTO_VALIDATION_RUNNING",
  "WAITING_HUMAN_REVIEW",
  "MANUAL_REVIEW",
  "WAITING_CLINIC_CONTACT",
  "CLINIC_CONTACTED",
  "WAITING_EXTERNAL_RESPONSE",
  "SUPERVISOR_REVIEW",
] as const;

/** Picks the active user of the given role with the fewest currently-open assigned cases — a simple load-balancing heuristic for the internal queue. */
export async function assignLeastBusyUser(role: UserRole): Promise<string | null> {
  const candidates = await prisma.user.findMany({
    where: { role, status: "ACTIVE" },
    select: { id: true },
  });
  if (candidates.length === 0) return null;

  const loadCounts = await Promise.all(
    candidates.map(async (candidate) => {
      const count = await prisma.medicalCertificateRequest.count({
        where: {
          status: { in: [...OPEN_STATUSES] },
          OR: [{ assignedToUserId: candidate.id }, { supervisorUserId: candidate.id }],
        },
      });
      return { id: candidate.id, count };
    }),
  );

  loadCounts.sort((a, b) => a.count - b.count);
  return loadCounts[0].id;
}
