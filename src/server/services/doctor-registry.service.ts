import { simulateLatency, weightedPick, randomInt } from "./mock-utils";
import { checkCrmFormat } from "@/lib/crm-format";
import type { DoctorVerificationResult } from "./types";

export interface DoctorRegistryService {
  verifyDoctor(
    name: string | null,
    crm: string | null,
    uf: string | null,
  ): Promise<DoctorVerificationResult>;
}

/**
 * Mock doctor-registry provider, standing in for a public/official CRM
 * lookup (e.g. CFM's public registry, when a stable public API/scrape
 * target is available) or a licensed data provider. Implement
 * DoctorRegistryService with the real call and keep the return contract.
 * See README "Como plugar validação de CRM".
 *
 * The one real thing this does today: check the CRM's format/UF plausibility
 * before anything else. An obviously-impossible CRM (non-numeric, wrong
 * digit count, fake UF) is rejected deterministically instead of having a
 * chance to land on the random "VALIDATED" outcome below — format checking
 * doesn't require a registry, so there's no reason to leave it to chance.
 */
export class MockDoctorRegistryService implements DoctorRegistryService {
  async verifyDoctor(
    name: string | null,
    crm: string | null,
    uf: string | null,
  ): Promise<DoctorVerificationResult> {
    await simulateLatency(600, 1800);

    if (!crm || !uf) {
      return {
        officialDoctorName: null,
        officialCrm: null,
        officialCrmUf: null,
        registrationStatus: null,
        specialty: null,
        sourceName: "Conselho Regional de Medicina (mock)",
        sourceUrl: null,
        matchScore: 0,
        status: "INCONCLUSIVE",
        rawResponse: { reason: "missing_crm_or_uf" },
        notes: "CRM ou UF não informados para consulta.",
      };
    }

    const format = checkCrmFormat(crm, uf);
    if (!format.plausible) {
      return {
        officialDoctorName: null,
        officialCrm: null,
        officialCrmUf: null,
        registrationStatus: null,
        specialty: null,
        sourceName: "Verificação de formato (determinística)",
        sourceUrl: null,
        matchScore: 0,
        status: "NOT_FOUND",
        rawResponse: { reason: format.reason, crm, uf },
        notes: "O CRM/UF informados não têm um formato reconhecido como válido para um registro no conselho de classe.",
      };
    }

    const outcome = weightedPick([
      { value: "VALIDATED" as const, weight: 68 },
      { value: "DIVERGENT" as const, weight: 14 },
      { value: "NOT_FOUND" as const, weight: 10 },
      { value: "QUERY_ERROR" as const, weight: 8 },
    ]);

    if (outcome === "VALIDATED") {
      const matchScore = randomInt(92, 100);
      return {
        officialDoctorName: name,
        officialCrm: crm,
        officialCrmUf: uf,
        registrationStatus: "Ativo",
        specialty: pick_specialty(),
        sourceName: "Conselho Regional de Medicina (mock)",
        sourceUrl: `https://mock-crm-registry.example/crm/${uf}/${crm}`,
        matchScore,
        status: "VALIDATED",
        rawResponse: { crm, uf, situacao: "ATIVO" },
        notes: null,
      };
    }

    if (outcome === "DIVERGENT") {
      return {
        officialDoctorName: name ? `${name.split(" ")[0]} ${name.split(" ").slice(-1)}` : null,
        officialCrm: crm,
        officialCrmUf: uf,
        registrationStatus: "Ativo",
        specialty: pick_specialty(),
        sourceName: "Conselho Regional de Medicina (mock)",
        sourceUrl: `https://mock-crm-registry.example/crm/${uf}/${crm}`,
        matchScore: randomInt(35, 60),
        status: "DIVERGENT",
        rawResponse: { crm, uf, situacao: "ATIVO" },
        notes: "Nome informado difere do nome registrado para este CRM.",
      };
    }

    if (outcome === "NOT_FOUND") {
      return {
        officialDoctorName: null,
        officialCrm: null,
        officialCrmUf: null,
        registrationStatus: null,
        specialty: null,
        sourceName: "Conselho Regional de Medicina (mock)",
        sourceUrl: null,
        matchScore: 0,
        status: "NOT_FOUND",
        rawResponse: { crm, uf, situacao: "NAO_LOCALIZADO" },
        notes: "Nenhum registro encontrado para o CRM/UF informados.",
      };
    }

    return {
      officialDoctorName: null,
      officialCrm: null,
      officialCrmUf: null,
      registrationStatus: null,
      specialty: null,
      sourceName: "Conselho Regional de Medicina (mock)",
      sourceUrl: null,
      matchScore: 0,
      status: "QUERY_ERROR",
      rawResponse: { error: "timeout" },
      notes: "Fonte externa indisponível no momento da consulta.",
    };
  }
}

function pick_specialty() {
  const specialties = [
    "Clínica Geral",
    "Ortopedia",
    "Ginecologia",
    "Cardiologia",
    "Psiquiatria",
    "Medicina do Trabalho",
  ];
  return specialties[Math.floor(Math.random() * specialties.length)];
}

export const doctorRegistryService: DoctorRegistryService = new MockDoctorRegistryService();
