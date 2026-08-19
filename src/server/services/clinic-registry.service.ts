import { prisma } from "@/lib/prisma";
import type { ClinicVerificationInput, ClinicVerificationResult } from "./types";
import { BrasilApiClinicRegistryAdapter } from "./adapters/brasilapi-clinic-registry.adapter";

export interface ClinicRegistryService {
  verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult>;
}

/**
 * CNPJ (Receita Federal via BrasilAPI, always live) stays the primary
 * signal — it's the one deterministic, always-current source. CNES is
 * layered on top as enrichment only, from the periodic bulk import in
 * scripts/import-verified-clinics.ts (see VerifiedClinic in schema.prisma):
 * when the document names a CNES code, or once BrasilAPI has confirmed a
 * CNPJ, this checks whether that establishment is also in our CNES cache
 * and folds in officialCnes/a small score adjustment — it never overrides
 * or downgrades the CNPJ verdict, only adds to it. An empty/stale CNES
 * cache (nothing imported yet) degrades silently back to CNPJ-only
 * behavior, exactly like before this existed.
 */
export class ClinicRegistryServiceWithCnes implements ClinicRegistryService {
  constructor(private cnpjAdapter: ClinicRegistryService) {}

  async verifyClinic(data: ClinicVerificationInput): Promise<ClinicVerificationResult> {
    const base = await this.cnpjAdapter.verifyClinic(data);

    const cnesDigits = data.cnes?.replace(/\D/g, "") || null;
    const cnpjDigits = base.officialCnpj?.replace(/\D/g, "") || null;
    if (!cnesDigits && !cnpjDigits) return base;

    const cached = cnesDigits
      ? await prisma.verifiedClinic.findUnique({ where: { cnesCode: cnesDigits } })
      : await prisma.verifiedClinic.findFirst({ where: { cnpj: cnpjDigits! } });
    if (!cached) return base;

    const cnesActive = cached.operationalStatus === "ATIVO";
    const cnesNote = cnesActive
      ? `Estabelecimento localizado no CNES (código ${cached.cnesCode}), situação ATIVO.`
      : `Estabelecimento localizado no CNES (código ${cached.cnesCode}), mas com indicação de desabilitação no cadastro.`;

    return {
      ...base,
      officialCnes: cached.cnesCode,
      matchScore: cnesActive ? Math.min(100, base.matchScore + 10) : base.matchScore,
      notes: base.notes ? `${base.notes} ${cnesNote}` : cnesNote,
      rawResponse: { ...base.rawResponse, cnes: { code: cached.cnesCode, status: cached.operationalStatus, sourceUrl: cached.sourceUrl } },
    };
  }
}

export const clinicRegistryService: ClinicRegistryService = new ClinicRegistryServiceWithCnes(new BrasilApiClinicRegistryAdapter());
