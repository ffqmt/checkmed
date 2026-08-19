import { prisma } from "@/lib/prisma";
import { createAsaasCustomer, createAsaasSubscription, createAsaasCharge, type AsaasBillingType } from "./adapters/asaas-billing.adapter";

const PLAN_DEFAULTS: Record<string, { baseFeeCents: number; perUnitCents: number }> = {
  STARTER: { baseFeeCents: 9_700, perUnitCents: 190 },
  GROWTH: { baseFeeCents: 19_700, perUnitCents: 150 },
  BUSINESS: { baseFeeCents: 39_700, perUnitCents: 120 },
};

export function planDefaults(tier: string) {
  return PLAN_DEFAULTS[tier] ?? null;
}

function nextMonthFirstDay(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates (or reuses) the Asaas customer for this organization and starts
 * the fixed-fee subscription. Requires the org to already have a plan
 * assigned (billingPlanTier/BaseFeeCents/PerUnitCents — see
 * assignBillingPlan in server/actions/billing.ts) and a valid CNPJ/email,
 * both of which already exist on Organization for other reasons.
 */
export async function activateSubscription(organizationId: string, billingType: AsaasBillingType): Promise<void> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  if (!org.billingPlanTier || org.billingBaseFeeCents == null) {
    throw new Error("Atribua um plano à organização antes de ativar a cobrança.");
  }

  let asaasCustomerId = org.asaasCustomerId;
  if (!asaasCustomerId) {
    const customer = await createAsaasCustomer({
      name: org.legalName,
      cnpj: org.cnpj,
      email: org.email,
      phone: org.phone,
      externalReference: org.id,
    });
    asaasCustomerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { asaasCustomerId } });
  }

  const subscription = await createAsaasSubscription({
    customerId: asaasCustomerId,
    billingType,
    valueCents: org.billingBaseFeeCents,
    nextDueDate: nextMonthFirstDay(),
    description: `MedCheck — plano ${org.billingPlanTier} (mensalidade-base)`,
  });

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, asaasSubscriptionId: subscription.id, status: "ACTIVE", billingType },
    update: { asaasSubscriptionId: subscription.id, status: "ACTIVE", billingType },
  });
}

/** Called once per real certificate request created — the metering event the monthly invoice is built from. Never fails the caller: billing metering must not be able to block the actual product. */
export async function recordUsage(organizationId: string, requestId: string): Promise<void> {
  try {
    await prisma.usageRecord.create({ data: { organizationId, requestId } });
  } catch (error) {
    console.error("[billing.service] failed to record usage", { organizationId, requestId, error });
  }
}

/**
 * Runs monthly (see /api/cron/billing) — for every organization with an
 * active subscription, sums the PREVIOUS calendar month's real UsageRecord
 * rows and creates a one-off Asaas charge for that amount. Idempotent per
 * organization+month via the @@unique([organizationId, referenceMonth])
 * constraint — re-running the same month is a no-op, not a double charge.
 */
export async function generateMonthlyInvoices(): Promise<{ created: number; skipped: number; failed: number }> {
  const now = new Date();
  const referenceMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodStart = referenceMonth;
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const orgs = await prisma.organization.findMany({
    where: { subscription: { status: "ACTIVE" }, billingPerUnitCents: { not: null }, asaasCustomerId: { not: null } },
    include: { subscription: true },
  });

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const org of orgs) {
    const alreadyBilled = await prisma.invoice.findUnique({ where: { organizationId_referenceMonth: { organizationId: org.id, referenceMonth } } });
    if (alreadyBilled) {
      skipped++;
      continue;
    }

    const usageCount = await prisma.usageRecord.count({ where: { organizationId: org.id, billedAt: { gte: periodStart, lt: periodEnd } } });
    if (usageCount === 0) {
      skipped++;
      continue;
    }

    const usageCents = usageCount * (org.billingPerUnitCents ?? 0);
    try {
      const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10)).toISOString().slice(0, 10);
      const charge = await createAsaasCharge({
        customerId: org.asaasCustomerId!,
        billingType: (org.subscription?.billingType as AsaasBillingType) ?? "BOLETO",
        valueCents: usageCents,
        dueDate,
        description: `MedCheck — uso de ${referenceMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} (${usageCount} atestados)`,
        externalReference: `${org.id}:${referenceMonth.toISOString().slice(0, 7)}`,
      });

      await prisma.invoice.create({
        data: {
          organizationId: org.id,
          asaasPaymentId: charge.id,
          referenceMonth,
          baseFeeCents: org.billingBaseFeeCents ?? 0,
          usageUnits: usageCount,
          usageCents,
          totalCents: usageCents,
          status: "PENDING",
          dueDate: new Date(charge.dueDate),
          invoiceUrl: charge.invoiceUrl,
        },
      });
      created++;
    } catch (error) {
      console.error("[billing.service] failed to invoice organization", { organizationId: org.id, error });
      failed++;
    }
  }

  return { created, skipped, failed };
}
