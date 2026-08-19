"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { permissions } from "@/lib/rbac";
import { recordAuditLog } from "@/server/audit";
import { activateSubscription, planDefaults } from "@/server/services/billing.service";
import type { AsaasBillingType } from "@/server/services/adapters/asaas-billing.adapter";
import type { BillingPlanTier } from "@prisma/client";

async function requireBillingAccess() {
  const session = await auth();
  if (!session?.user || !permissions.manageBilling(session.user.role)) {
    throw new Error("Sem permissão para gerenciar cobrança.");
  }
  return session;
}

/** Sets/changes an organization's plan. baseFeeCents/perUnitCents default from the standard tier price list but can be overridden — real contracts often negotiate a different number than the list price. */
export async function assignBillingPlan(
  organizationId: string,
  tier: BillingPlanTier,
  baseFeeCents?: number,
  perUnitCents?: number,
) {
  const session = await requireBillingAccess();
  const defaults = planDefaults(tier);
  const resolvedBase = baseFeeCents ?? defaults?.baseFeeCents;
  const resolvedPerUnit = perUnitCents ?? defaults?.perUnitCents;
  if (resolvedBase == null || resolvedPerUnit == null) {
    return { error: "Informe mensalidade-base e valor por atestado (sem valor padrão para ENTERPRISE)." };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { billingPlanTier: tier, billingBaseFeeCents: resolvedBase, billingPerUnitCents: resolvedPerUnit },
  });

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "BILLING_PLAN_ASSIGNED",
    entityType: "Organization",
    entityId: organizationId,
    newData: { tier, baseFeeCents: resolvedBase, perUnitCents: resolvedPerUnit },
  });

  revalidatePath("/admin/billing");
  return { success: true };
}

/** Creates the Asaas customer (first time only) and starts the fixed-fee subscription. Requires a plan already assigned and ASAAS_API_KEY configured. */
export async function activateOrganizationSubscription(organizationId: string, billingType: AsaasBillingType) {
  const session = await requireBillingAccess();
  try {
    await activateSubscription(organizationId, billingType);
  } catch (error) {
    return { error: (error as Error).message };
  }

  await recordAuditLog({
    organizationId,
    userId: session.user.id,
    action: "BILLING_SUBSCRIPTION_ACTIVATED",
    entityType: "Subscription",
    newData: { billingType },
  });

  revalidatePath("/admin/billing");
  return { success: true };
}
