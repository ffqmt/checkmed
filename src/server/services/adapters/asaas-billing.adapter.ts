/**
 * Real Asaas (asaas.com) API calls — the standard recurring-billing
 * provider for Brazilian SaaS/service businesses (boleto/PIX-first, no
 * international-card assumption, CNPJ-native onboarding), a better fit here
 * than Stripe given every client is a Brazilian company. Confirmed against
 * Asaas's own reference docs (docs.asaas.com) — POST /v3/customers,
 * POST /v3/subscriptions, POST /v3/payments, auth via the `access_token`
 * header (not Authorization: Bearer).
 *
 * ASAAS_API_KEY must come from a real Asaas account (sandbox for testing —
 * api-sandbox.asaas.com, free, instant signup — or production once ready).
 * Nothing here has been exercised against a live account yet; that requires
 * a real key only the account owner can generate. Every call is a plain
 * fetch, so a missing/invalid key surfaces as a normal HTTP error rather
 * than anything faked.
 */
const ASAAS_BASE_URL = process.env.ASAAS_ENV === "PRODUCTION" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada — cobrança real desativada até isso ser preenchido.");
  return key;
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: getApiKey(),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const json = await response.json();
  if (!response.ok) {
    const message = json?.errors?.[0]?.description ?? `Asaas retornou HTTP ${response.status}.`;
    throw new Error(message);
  }
  return json as T;
}

export type AsaasCustomer = { id: string; name: string; cpfCnpj: string };

export async function createAsaasCustomer(params: { name: string; cnpj: string; email: string; phone?: string | null; externalReference: string }): Promise<AsaasCustomer> {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      cpfCnpj: params.cnpj.replace(/\D/g, ""),
      email: params.email,
      phone: params.phone ?? undefined,
      externalReference: params.externalReference,
    }),
  });
}

export type AsaasBillingType = "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED";

export type AsaasSubscription = { id: string; status: string; nextDueDate: string };

/** Bills the FIXED monthly base fee only — Asaas subscriptions are a fixed recurring amount by design, they can't bill a variable usage total. See createAsaasCharge for the variable portion. */
export async function createAsaasSubscription(params: {
  customerId: string;
  billingType: AsaasBillingType;
  valueCents: number;
  nextDueDate: string; // YYYY-MM-DD
  description: string;
}): Promise<AsaasSubscription> {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.valueCents / 100,
      nextDueDate: params.nextDueDate,
      cycle: "MONTHLY",
      description: params.description,
    }),
  });
}

export type AsaasCharge = { id: string; status: string; invoiceUrl: string | null; dueDate: string };

/** One-off charge for the previous month's real usage (UsageRecord count × per-unit price) — created fresh every month by the billing cron, never a subscription, since the amount varies. */
export async function createAsaasCharge(params: {
  customerId: string;
  billingType: AsaasBillingType;
  valueCents: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference: string;
}): Promise<AsaasCharge> {
  return asaasFetch<AsaasCharge>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      value: params.valueCents / 100,
      dueDate: params.dueDate,
      description: params.description,
      externalReference: params.externalReference,
    }),
  });
}

export type AsaasInstallmentPurchase = { id: string; status: string; invoiceUrl: string | null; installmentCount: number | null; installment: string | null };

/**
 * A closed, fixed-term deal (e.g. an annual package) paid over
 * `installmentCount` parcels — Asaas splits `totalValueCents` across them
 * automatically (`totalValue`, not `value` — the field name Asaas uses
 * specifically for installment purchases on POST /v3/payments). Unlike
 * createAsaasSubscription this never recurs on its own; a new package next
 * term means calling this again.
 */
export async function createAsaasInstallmentPurchase(params: {
  customerId: string;
  billingType: AsaasBillingType;
  totalValueCents: number;
  installmentCount: number;
  dueDate: string; // YYYY-MM-DD, first installment
  description: string;
  externalReference: string;
}): Promise<AsaasInstallmentPurchase> {
  return asaasFetch<AsaasInstallmentPurchase>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customerId,
      billingType: params.billingType,
      totalValue: params.totalValueCents / 100,
      installmentCount: params.installmentCount,
      dueDate: params.dueDate,
      description: params.description,
      externalReference: params.externalReference,
    }),
  });
}

/** Registers our webhook URL with Asaas — a one-time setup call (see docs "Criar novo Webhook pela API"), not something run per-request. Kept here for completeness/documentation; actually invoking it is a manual one-off step (see README "Cobrança"). */
export async function createAsaasWebhook(params: { url: string; accessToken: string; email: string }): Promise<{ id: string }> {
  return asaasFetch<{ id: string }>("/webhooks", {
    method: "POST",
    body: JSON.stringify({
      name: "MedCheck",
      url: params.url,
      email: params.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: params.accessToken,
      events: ["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "SUBSCRIPTION_CREATED", "SUBSCRIPTION_INACTIVATED"],
    }),
  });
}
