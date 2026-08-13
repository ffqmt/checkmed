import type {
  QrCodeDetectionResult,
  QrCodeUrlValidationResult,
  QrCodeVerificationOutcome,
} from "./types";
import { decodeQrFromDocument, checkUrlReachable } from "./adapters/real-qrcode-decoder";

const TRUSTED_DOMAINS = ["autenticidade.saude.gov.br", "cfm.org.br", "gov.br"];

export interface QrCodeVerificationService {
  detectQrCode(file: { buffer: Buffer; mimeType: string }): Promise<QrCodeDetectionResult>;
  validateAuthenticationUrl(url: string | null): Promise<QrCodeUrlValidationResult>;
  /** Real ground truth (decoded from the image) vs. what the extraction step claimed — a disagreement is itself a signal. */
  compareDecodedWithClaimed(decodedContent: string | null, claimedContent: string | null): QrCodeVerificationOutcome;
}

/**
 * Real QR/authentication-link verification. Unlike doctor/clinic
 * registries, this needs no vendor and has no ongoing cost — QR decoding is
 * a local library (jsqr) and reachability is a plain HTTP request — so
 * there's no MOCK fallback to toggle, this is always real.
 *
 * What's deliberately NOT done: scraping the destination page and comparing
 * its fields against the document. That would require per-institution
 * logic to be honest about, so it's left out rather than faked. Findings
 * here are limited to what can be verified for any domain: does the QR
 * decode to what the document claims, is the domain a known trusted
 * issuer, and does the URL actually respond.
 */
export class RealQrCodeVerificationService implements QrCodeVerificationService {
  async detectQrCode(file: { buffer: Buffer; mimeType: string }): Promise<QrCodeDetectionResult> {
    const content = await decodeQrFromDocument(file.buffer, file.mimeType);
    return { found: content !== null, content };
  }

  async validateAuthenticationUrl(url: string | null): Promise<QrCodeUrlValidationResult> {
    if (!url) {
      return { domain: null, isDomainTrusted: false, httpStatus: null, reachable: false, extractedPageData: null };
    }

    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      return { domain: null, isDomainTrusted: false, httpStatus: null, reachable: false, extractedPageData: null };
    }

    const isDomainTrusted = TRUSTED_DOMAINS.some((d) => domain.endsWith(d));
    const { reachable, httpStatus } = await checkUrlReachable(url);
    return { domain, isDomainTrusted, httpStatus, reachable, extractedPageData: null };
  }

  compareDecodedWithClaimed(decodedContent: string | null, claimedContent: string | null): QrCodeVerificationOutcome {
    if (!decodedContent && !claimedContent) {
      return { status: "NOT_PRESENT", matchScore: null, notes: null };
    }
    if (!decodedContent && claimedContent) {
      return {
        status: "DATA_MISMATCH",
        matchScore: 0,
        notes: "A leitura do documento identificou um código de autenticação, mas não foi possível decodificar nenhum QR Code de verdade na imagem.",
      };
    }
    if (decodedContent && claimedContent && decodedContent !== claimedContent) {
      return {
        status: "DATA_MISMATCH",
        matchScore: 20,
        notes: "O conteúdo do QR Code decodificado da imagem diverge do que a leitura do documento identificou.",
      };
    }
    return { status: "VALID", matchScore: 100, notes: null };
  }
}

export const qrCodeVerificationService: QrCodeVerificationService = new RealQrCodeVerificationService();
