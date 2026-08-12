import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { isValidCpf } from "@/lib/cpf";
import type { DocumentIntelligenceResult } from "../types";

/**
 * Real document-intelligence provider: one Claude Sonnet 5 vision call reads
 * the actual uploaded file and returns both the structured fields the mock
 * extraction service used to fabricate, and a set of content-based
 * authenticity observations (unfilled signature/CRM field, malformed
 * identifiers, generic template boilerplate) that pixel-level forensics
 * cannot see, because they live in the document's text/layout, not its
 * compression history. The CPF check-digit itself is verified in code below
 * — arithmetic is not something to trust an LLM to get right — the model
 * only needs to transcribe the number.
 */
const ExtractionSchema = z.object({
  rawText: z.string().describe("Full transcription of all text visible in the document, in reading order."),
  ocrConfidence: z.number().min(0).max(100).describe("0-100: how confident you are in the transcription given image quality/legibility."),
  ocrWarnings: z.array(z.string()).describe("Short notes about legibility issues, e.g. blurry regions. Empty array if none."),

  doctorName: z.string().nullable(),
  doctorCrm: z.string().nullable().describe("Digits only, no formatting."),
  doctorCrmUf: z.string().nullable().describe("Two-letter Brazilian state abbreviation."),
  certificateIssueDate: z.string().nullable().describe("ISO date YYYY-MM-DD, or null if not present/legible."),
  absenceDays: z.number().nullable(),
  absenceStartDate: z.string().nullable().describe("ISO date YYYY-MM-DD."),
  absenceEndDate: z.string().nullable().describe("ISO date YYYY-MM-DD."),
  clinicName: z.string().nullable(),
  clinicCnpj: z.string().nullable(),
  clinicCnes: z.string().nullable(),
  clinicAddress: z.string().nullable(),
  clinicPhone: z.string().nullable(),
  clinicEmail: z.string().nullable(),
  cidCode: z.string().nullable(),
  qrCodeContent: z.string().nullable().describe("Raw content encoded in a QR code, if one is visible."),
  authenticationUrl: z.string().nullable().describe("A verification/authentication URL printed on the document, if any."),
  patientCpf: z.string().nullable().describe("The patient's CPF exactly as printed in the document body, digits only. Null if not present."),

  contentAuthenticityRiskScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "0-100, your own assessment of how much the document's TEXT/LAYOUT (not image quality) resembles a freely fabricated document rather than a genuine clinic/hospital record — e.g. a labeled signature or CRM field left visibly unfilled, generic centered 'atestado gerador' layout, garbled or nonsensical legal boilerplate, placeholder text like 'o(a) sr.(a)' never resolved, inconsistent or implausible identifiers. A real scanned/photographed clinic form with a genuine signature and letterhead should score low even if image quality is poor. Score 0 if you see no such content-level red flags.",
    ),
  contentFindings: z
    .array(
      z.object({
        area: z.string().describe("Short label, e.g. 'Assinatura/CRM' or 'Formato do CPF'."),
        description: z
          .string()
          .describe(
            "Neutral, non-accusatory description of the observation in Portuguese — never state the document is fake/forged, only describe what was or wasn't observed (e.g. 'Não foi possível identificar uma assinatura ou número de CRM preenchido no campo destinado a isso.').",
          ),
        severity: z.enum(["info", "low", "medium", "high"]),
      }),
    )
    .describe("Empty array if nothing noteworthy was observed."),
});

const SYSTEM_PROMPT = `Você é um assistente de back-office que lê atestados médicos (imagem ou PDF) e devolve os campos estruturados exatamente como aparecem no documento, mais uma avaliação neutra de autenticidade de conteúdo.

Regras:
- Transcreva o que está escrito no documento. Nunca invente ou preencha um campo que não está visível — use null.
- A avaliação de autenticidade de conteúdo é sobre TEXTO E LAYOUT, não qualidade de imagem/foto. Um documento físico real, mesmo mal escaneado ou fotografado, com assinatura e carimbo genuínos, deve pontuar baixo. Um documento com campos de assinatura/CRM visivelmente em branco, texto de aparência genérica de gerador automático, ou identificadores malformados deve pontuar mais alto.
- Use linguagem neutra e não acusatória em toda descrição — nunca afirme que o documento é falso ou fraudulento. Descreva apenas o que foi ou não observado (ex.: "não foi possível localizar uma assinatura preenchida", nunca "assinatura falsificada").`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function documentContentBlock(buffer: Buffer, mimeType: string) {
  const data = buffer.toString("base64");
  if (mimeType === "application/pdf") {
    return { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data } };
  }
  const media_type = (mimeType === "image/jpg" ? "image/jpeg" : mimeType) as "image/jpeg" | "image/png";
  return { type: "image" as const, source: { type: "base64" as const, media_type, data } };
}

export async function extractWithClaudeVision(file: { buffer: Buffer; mimeType: string }): Promise<DocumentIntelligenceResult> {
  const response = await getClient().messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          documentContentBlock(file.buffer, file.mimeType),
          { type: "text", text: "Leia este atestado médico e devolva os campos estruturados." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Claude não retornou uma extração estruturada válida.");
  }

  const contentFindings = [...parsed.contentFindings];
  let contentAuthenticityRiskScore = parsed.contentAuthenticityRiskScore;

  if (parsed.patientCpf && !isValidCpf(parsed.patientCpf)) {
    contentFindings.push({
      area: "Formato do CPF",
      description: "O CPF informado no corpo do documento não possui o formato/dígito verificador válido para um CPF brasileiro.",
      severity: "high",
    });
    contentAuthenticityRiskScore = Math.max(contentAuthenticityRiskScore, 65);
  }

  return {
    ocr: { rawText: parsed.rawText, confidence: parsed.ocrConfidence, warnings: parsed.ocrWarnings },
    extraction: {
      doctorName: parsed.doctorName,
      doctorCrm: parsed.doctorCrm,
      doctorCrmUf: parsed.doctorCrmUf,
      certificateIssueDate: parseIsoDate(parsed.certificateIssueDate),
      absenceDays: parsed.absenceDays,
      absenceStartDate: parseIsoDate(parsed.absenceStartDate),
      absenceEndDate: parseIsoDate(parsed.absenceEndDate),
      clinicName: parsed.clinicName,
      clinicCnpj: parsed.clinicCnpj,
      clinicCnes: parsed.clinicCnes,
      clinicAddress: parsed.clinicAddress,
      clinicPhone: parsed.clinicPhone,
      clinicEmail: parsed.clinicEmail,
      cidCode: parsed.cidCode,
      qrCodeContent: parsed.qrCodeContent,
      authenticationUrl: parsed.authenticationUrl,
      confidence: { overall: parsed.ocrConfidence },
      warnings: parsed.ocrWarnings,
    },
    contentAuthenticityRiskScore,
    contentFindings,
  };
}
