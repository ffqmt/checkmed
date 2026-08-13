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
 * No real-time CRM registry is wired in: CFM has no public API, and the
 * commercial providers investigated (Netrin, Infosimples) require a sales
 * contact rather than a self-serve key — see README "Como plugar validação
 * de CRM" for the integration point once one is contracted.
 *
 * Until then, this NEVER fabricates a confirmation. It only asserts what's
 * actually deterministic — CRM/UF format plausibility. A format-implausible
 * CRM is a real negative signal (NOT_FOUND). A format-plausible CRM is
 * reported INCONCLUSIVE, not VALIDATED: the format being right says nothing
 * about whether this doctor is actually registered with it. An earlier
 * version of this service used a random weighted outcome (68% "VALIDATED"
 * with a fabricated official name/specialty/match score) regardless of
 * whether the doctor was real — that presented mocked data as a genuine
 * registry confirmation and has been removed.
 */
export class FormatOnlyDoctorRegistryService implements DoctorRegistryService {
  async verifyDoctor(
    name: string | null,
    crm: string | null,
    uf: string | null,
  ): Promise<DoctorVerificationResult> {
    if (!crm || !uf) {
      return {
        officialDoctorName: null,
        officialCrm: null,
        officialCrmUf: null,
        registrationStatus: null,
        specialty: null,
        sourceName: "Nenhuma fonte consultada",
        sourceUrl: null,
        matchScore: 0,
        status: "INCONCLUSIVE",
        rawResponse: { reason: "missing_crm_or_uf" },
        notes: "CRM ou UF não informados no documento — não é possível consultar.",
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

    return {
      officialDoctorName: null,
      officialCrm: null,
      officialCrmUf: null,
      registrationStatus: null,
      specialty: null,
      sourceName: "Verificação de formato (determinística)",
      sourceUrl: null,
      matchScore: 0,
      status: "INCONCLUSIVE",
      rawResponse: { reason: "no_registry_integration", crm, uf },
      notes:
        "O CRM informado tem formato válido, mas ainda não há integração com um registro oficial (CFM/CRM) para confirmar se este profissional está de fato registrado com este número. Nenhuma confirmação real foi feita.",
    };
  }
}

export const doctorRegistryService: DoctorRegistryService = new FormatOnlyDoctorRegistryService();
