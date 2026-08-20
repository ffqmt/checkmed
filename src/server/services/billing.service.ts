import { prisma } from "@/lib/prisma";
import {
  createAsaasCustomer,
  createAsaasSubscription,
  createAsaasCharge,
  createAsaasInstallmentPurchase,
  type AsaasBillingType,
} from "./adapters/asaas-billing.adapter";

const PLAN_DEFAULTS: Record<string, { baseFeeCents: number; perUnitCents: number }> = {
  STARTER: { baseFeeCents: 9_700, perUnitCents: 190 },
  GROWTH: { baseFeeCents: 19_700, perUnitCents: 150 },
  BUSINESS: { baseFeeCents: 39_700, perUnitCents: 120 },
};

export function planDefaults(tier: string) {
  return PLAN_DEFAULTS[tier] ?? null;
}

/**
 * Asaas rejects any charge below these values (confirmed against Asaas's
 * own help center, 2026-08-20 — "Quais são os limites para criação de
 * cobranças?"). Applies per charge for a one-off payment, and per
 * installment for a parcelled one. BOLETO/PIX/UNDEFINED default to the
 * higher R$10 floor when the billing type isn't known yet (e.g. before a
 * payment method is chosen), which is always safe to assume.
 */
const ASAAS_MINIMUM_CHARGE_CENTS: Record<AsaasBillingType, number> = {
  CREDIT_CARD: 500,
  BOLETO: 1000,
  PIX: 1000,
  UNDEFINED: 1000,
};

export function minimumChargeCentsFor(billingType?: AsaasBillingType | null): number {
  return billingType ? ASAAS_MINIMUM_CHARGE_CENTS[billingType] : ASAAS_MINIMUM_CHARGE_CENTS.BOLETO;
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

/**
 * Sells a closed, flat annual package (see AnnualPackage in schema.prisma)
 * — one negotiated total, paid over `installmentCount` parcels, valid for
 * 12 months from today. No variable usage is metered on top: an org with
 * an ACTIVE AnnualPackage is skipped entirely by generateMonthlyInvoices().
 */
export async function activateAnnualPackage(
  organizationId: string,
  totalValueCents: number,
  installmentCount: number,
  billingType: AsaasBillingType,
): Promise<void> {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });

  const perInstallmentCents = Math.round(totalValueCents / installmentCount);
  const minimum = minimumChargeCentsFor(billingType);
  if (perInstallmentCents < minimum) {
    throw new Error(
      `Cada parcela ficaria em ${formatBRL(perInstallmentCents)} — abaixo do mínimo da Asaas para essa forma de pagamento (${formatBRL(minimum)}). Aumente o valor total ou reduza o número de parcelas.`,
    );
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

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setFullYear(endDate.getFullYear() + 1);

  const purchase = await createAsaasInstallmentPurchase({
    customerId: asaasCustomerId,
    billingType,
    totalValueCents,
    installmentCount,
    dueDate: startDate.toISOString().slice(0, 10),
    description: `MedCheck — pacote anual (${installmentCount}x)`,
    externalReference: `${org.id}:annual:${startDate.getFullYear()}`,
  });

  await prisma.annualPackage.create({
    data: {
      organizationId: org.id,
      totalValueCents,
      installmentCount,
      billingType,
      asaasPaymentId: purchase.id,
      asaasInstallmentId: purchase.installment,
      invoiceUrl: purchase.invoiceUrl,
      startDate,
      endDate,
      status: "ACTIVE",
    },
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
 * active subscription and no active annual package, gathers every
 * not-yet-invoiced UsageRecord (`invoiceId: null`) up to the start of the
 * current month and tries to bill it as one charge.
 *
 * Asaas enforces a real minimum charge value (see ASAAS_MINIMUM_CHARGE_CENTS
 * above) — a client with too little usage in a given stretch simply doesn't
 * clear it. Rather than let that charge fail every month forever (the old
 * behavior — the usage was silently dropped, never billed), unbilled rows
 * are left with `invoiceId: null` and picked up again by the next run,
 * accumulating across as many months as it takes to clear the floor.
 */
export async function generateMonthlyInvoices(): Promise<{ created: number; skipped: number; failed: number }> {
  const now = new Date();
  const referenceMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const orgs = await prisma.organization.findMany({
    where: {
      subscription: { status: "ACTIVE" },
      billingPerUnitCents: { not: null },
      asaasCustomerId: { not: null },
      annualPackages: { none: { status: "ACTIVE" } },
    },
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

    const unbilled = await prisma.usageRecord.findMany({
      where: { organizationId: org.id, invoiceId: null, occurredAt: { lt: periodEnd } },
      select: { id: true },
    });
    if (unbilled.length === 0) {
      skipped++;
      continue;
    }

    const usageCents = unbilled.length * (org.billingPerUnitCents ?? 0);
    const billingType = (org.subscription?.billingType as AsaasBillingType) ?? "BOLETO";
    if (usageCents < minimumChargeCentsFor(billingType)) {
      // Below the Asaas floor — leave unbilled, rolls into next month's run automatically.
      skipped++;
      continue;
    }

    try {
      const dueDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10)).toISOString().slice(0, 10);
      const charge = await createAsaasCharge({
        customerId: org.asaasCustomerId!,
        billingType,
        valueCents: usageCents,
        dueDate,
        description: `MedCheck — uso acumulado até ${periodEnd.toLocaleDateString("pt-BR")} (${unbilled.length} atestados)`,
        externalReference: `${org.id}:${referenceMonth.toISOString().slice(0, 7)}`,
      });

      const invoice = await prisma.invoice.create({
        data: {
          organizationId: org.id,
          asaasPaymentId: charge.id,
          referenceMonth,
          baseFeeCents: org.billingBaseFeeCents ?? 0,
          usageUnits: unbilled.length,
          usageCents,
          totalCents: usageCents,
          status: "PENDING",
          dueDate: new Date(charge.dueDate),
          invoiceUrl: charge.invoiceUrl,
        },
      });
      await prisma.usageRecord.updateMany({ where: { id: { in: unbilled.map((u) => u.id) } }, data: { invoiceId: invoice.id } });
      created++;
    } catch (error) {
      console.error("[billing.service] failed to invoice organization", { organizationId: org.id, error });
      failed++;
    }
  }

  return { created, skipped, failed };
}
