import { simulateLatency, weightedPick, randomInt } from "./mock-utils";
import type { ClinicVerificationInput, ClinicVerificationResult } from "./types";
import { BrasilApiClinicRegistryAdapter } from "./adapters/brasilapi-clinic-registry.adapter";

export interface ClinicRegistryService {
  verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult>;
}

/**
 * Mock clinic/hospital registry provider, standing in for CNPJ lookups
 * (ReceitaWS/BrasilAPI), CNES (DATASUS) queries, and an internal cadastre
 * of clinics already confirmed in past cases. Implement
 * ClinicRegistryService with real calls and keep the return contract. See
 * README "Como plugar consulta de clínicas/CNPJ/CNES".
 */
export class MockClinicRegistryService implements ClinicRegistryService {
  async verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult> {
    await simulateLatency(600, 1800);

    if (!data.cnpj && !data.cnes && !data.clinicName) {
      return {
        officialName: null,
        officialCnpj: null,
        officialCnes: null,
        officialAddress: null,
        officialPhone: null,
        officialEmail: null,
        website: null,
        sourceName: "Cadastro CNES / Receita Federal (mock)",
        sourceUrl: null,
        matchScore: 0,
        status: "INCONCLUSIVE",
        rawResponse: { reason: "missing_identifiers" },
        notes: "Dados insuficientes para identificar a clínica/hospital.",
      };
    }

    const outcome = weightedPick([
      { value: "VALIDATED" as const, weight: 62 },
      { value: "DIVERGENT" as const, weight: 16 },
      { value: "NOT_FOUND" as const, weight: 14 },
      { value: "QUERY_ERROR" as const, weight: 8 },
    ]);

    if (outcome === "VALIDATED") {
      return {
        officialName: data.clinicName,
        officialCnpj: data.cnpj,
        officialCnes: data.cnes,
        officialAddress: data.address,
        officialPhone: data.phone,
        officialEmail: data.email,
        website: data.clinicName
          ? `https://${data.clinicName.toLowerCase().replace(/[^a-z]+/g, "")}.com.br`
          : null,
        sourceName: "Cadastro CNES / Receita Federal (mock)",
        sourceUrl: data.cnpj ? `https://mock-cnpj-lookup.example/cnpj/${data.cnpj}` : null,
        matchScore: randomInt(90, 100),
        status: "VALIDATED",
        rawResponse: { cnpj: data.cnpj, situacao: "ATIVA" },
        notes: null,
      };
    }

    if (outcome === "DIVERGENT") {
      return {
        officialName: data.clinicName ? `${data.clinicName} Ltda` : null,
        officialCnpj: data.cnpj,
        officialCnes: data.cnes,
        officialAddress: "Endereço oficial diverge do informado no documento",
        officialPhone: data.phone,
        officialEmail: data.email,
        website: null,
        sourceName: "Cadastro CNES / Receita Federal (mock)",
        sourceUrl: data.cnpj ? `https://mock-cnpj-lookup.example/cnpj/${data.cnpj}` : null,
        matchScore: randomInt(35, 60),
        status: "DIVERGENT",
        rawResponse: { cnpj: data.cnpj, situacao: "ATIVA" },
        notes: "Endereço ou telefone informados divergem do cadastro oficial.",
      };
    }

    if (outcome === "NOT_FOUND") {
      return {
        officialName: null,
        officialCnpj: null,
        officialCnes: null,
        officialAddress: null,
        officialPhone: null,
        officialEmail: null,
        website: null,
        sourceName: "Cadastro CNES / Receita Federal (mock)",
        sourceUrl: null,
        matchScore: 0,
        status: "NOT_FOUND",
        rawResponse: { cnpj: data.cnpj, situacao: "NAO_LOCALIZADO" },
        notes: "Nenhum registro localizado para os dados informados.",
      };
    }

    return {
      officialName: null,
      officialCnpj: null,
      officialCnes: null,
      officialAddress: null,
      officialPhone: null,
      officialEmail: null,
      website: null,
      sourceName: "Cadastro CNES / Receita Federal (mock)",
      sourceUrl: null,
      matchScore: 0,
      status: "QUERY_ERROR",
      rawResponse: { error: "timeout" },
      notes: "Fonte externa indisponível no momento da consulta.",
    };
  }
}

/**
 * Provider selection mirrors ai-detection.service.ts / document-intelligence.service.ts.
 * CLINIC_REGISTRY_PROVIDER unset/"MOCK" keeps the randomized mock above.
 * "BRASILAPI" switches to a real, free Receita Federal CNPJ lookup — see
 * adapters/brasilapi-clinic-registry.adapter.ts.
 */
class ProviderSelectedClinicRegistryService implements ClinicRegistryService {
  private mock = new MockClinicRegistryService();

  async verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult> {
    const provider = (process.env.CLINIC_REGISTRY_PROVIDER ?? "MOCK").toUpperCase();
    if (provider === "BRASILAPI") {
      return new BrasilApiClinicRegistryAdapter().verifyClinic(data);
    }
    return this.mock.verifyClinic(data);
  }
}

export const clinicRegistryService: ClinicRegistryService = new ProviderSelectedClinicRegistryService();
