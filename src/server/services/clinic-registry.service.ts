import type { ClinicVerificationInput, ClinicVerificationResult } from "./types";
import { BrasilApiClinicRegistryAdapter } from "./adapters/brasilapi-clinic-registry.adapter";

export interface ClinicRegistryService {
  verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult>;
}

/**
 * BrasilAPI's Receita Federal CNPJ lookup (see
 * adapters/brasilapi-clinic-registry.adapter.ts) is free, needs no API key,
 * and has no rate-limit contract to negotiate — so unlike doctor-registry.ts
 * (no real CRM source exists) there was never a good reason to ship a
 * fabricated fallback here. This used to be gated behind a
 * CLINIC_REGISTRY_PROVIDER=MOCK/BRASILAPI switch defaulting to a randomized
 * mock (62% "VALIDATED" with an invented match score, regardless of whether
 * the clinic was real) — an unset/misconfigured env var in any environment
 * would have silently presented fake data as a genuine registry
 * confirmation, the same class of bug fixed in doctor-registry.ts. Removed;
 * this is now always the real lookup.
 */
export const clinicRegistryService: ClinicRegistryService = new BrasilApiClinicRegistryAdapter();
