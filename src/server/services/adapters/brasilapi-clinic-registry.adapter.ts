import type { ClinicRegistryService } from "../clinic-registry.service";
import type { ClinicVerificationInput, ClinicVerificationResult } from "../types";
import { namesLooselyMatch } from "@/lib/fuzzy-match";

/**
 * Real clinic/hospital verification against the Receita Federal's public
 * CNPJ registry, via BrasilAPI (https://brasilapi.com.br) — free, no API
 * key, no rate-limit contract needed. Confirms the CNPJ exists, is
 * registered as ATIVA (active), and that the razão social loosely matches
 * the clinic name the document declared. Does not verify CNES (health
 * facility registry) itself — no free/public single-lookup API exists for
 * that — but the caller (clinic-registry.service.ts) layers a CNES check
 * from a periodically-imported bulk dataset on top of this result.
 */
type BrasilApiCnpjResponse = {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ddd_telefone_1: string | null;
  ddd_telefone_2: string | null;
  email: string | null;
  cnae_fiscal_descricao: string | null;
};

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function emptyResult(overrides: Partial<ClinicVerificationResult>): ClinicVerificationResult {
  return {
    officialName: null,
    officialCnpj: null,
    officialCnes: null,
    officialAddress: null,
    officialPhone: null,
    officialEmail: null,
    website: null,
    sourceName: "Receita Federal (BrasilAPI)",
    sourceUrl: null,
    matchScore: 0,
    status: "INCONCLUSIVE",
    rawResponse: {},
    notes: null,
    ...overrides,
  };
}

export class BrasilApiClinicRegistryAdapter implements ClinicRegistryService {
  async verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult> {
    if (!data.cnpj) {
      return emptyResult({
        notes: "Nenhum CNPJ foi identificado no documento — não é possível consultar o cadastro oficial da Receita Federal.",
        rawResponse: { reason: "missing_cnpj" },
      });
    }

    const digits = data.cnpj.replace(/\D/g, "");
    if (digits.length !== 14) {
      return emptyResult({
        status: "QUERY_ERROR",
        notes: "O CNPJ informado no documento não possui o formato esperado (14 dígitos).",
        rawResponse: { reason: "invalid_cnpj_format", value: data.cnpj },
      });
    }

    let response: Response;
    try {
      // BrasilAPI's edge (Cloudflare) 403s Node's default fetch User-Agent —
      // confirmed live: identical request succeeds with a custom UA.
      response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
        signal: AbortSignal.timeout(10_000),
        headers: { "User-Agent": "MedCheck/1.0 (+https://medcheck.com.br)", Accept: "application/json" },
      });
    } catch (error) {
      return emptyResult({
        status: "QUERY_ERROR",
        notes: "Não foi possível consultar a Receita Federal no momento.",
        rawResponse: { error: (error as Error).message },
      });
    }

    if (response.status === 404) {
      return emptyResult({
        status: "NOT_FOUND",
        notes: "CNPJ não localizado no cadastro da Receita Federal.",
        rawResponse: { cnpj: digits, httpStatus: 404 },
      });
    }
    if (!response.ok) {
      return emptyResult({
        status: "QUERY_ERROR",
        notes: `A consulta à Receita Federal retornou um erro inesperado (HTTP ${response.status}).`,
        rawResponse: { cnpj: digits, httpStatus: response.status },
      });
    }

    const json = (await response.json()) as BrasilApiCnpjResponse;
    const officialAddress =
      [json.logradouro, json.numero, json.complemento, json.bairro, json.municipio, json.uf, json.cep].filter(Boolean).join(", ") || null;
    const officialPhone = json.ddd_telefone_1 || json.ddd_telefone_2 || null;
    const isActive = json.descricao_situacao_cadastral === "ATIVA";
    const nameMatches = data.clinicName
      ? namesLooselyMatch(data.clinicName, json.razao_social ?? "") || (json.nome_fantasia ? namesLooselyMatch(data.clinicName, json.nome_fantasia) : false)
      : true;

    let matchScore = isActive ? 70 : 15;
    matchScore += nameMatches ? 25 : -25;
    matchScore = clamp(matchScore);

    const status: ClinicVerificationResult["status"] = !isActive || !nameMatches ? "DIVERGENT" : "VALIDATED";
    const notes = !isActive
      ? `Situação cadastral do CNPJ na Receita Federal: ${json.descricao_situacao_cadastral ?? "não informada"}.`
      : !nameMatches
        ? "A razão social/nome fantasia oficial diverge do nome de clínica/hospital informado no documento."
        : null;

    return {
      officialName: json.razao_social ?? json.nome_fantasia,
      officialCnpj: digits,
      officialCnes: null,
      officialAddress,
      officialPhone,
      officialEmail: json.email,
      website: null,
      sourceName: "Receita Federal (BrasilAPI)",
      sourceUrl: `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
      matchScore,
      status,
      rawResponse: {
        cnpj: digits,
        razao_social: json.razao_social,
        nome_fantasia: json.nome_fantasia,
        situacao_cadastral: json.descricao_situacao_cadastral,
        atividade_principal: json.cnae_fiscal_descricao,
      },
      notes,
    };
  }
}
