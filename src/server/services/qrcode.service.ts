import { simulateLatency, weightedPick, randomInt } from "./mock-utils";
import type {
  QrCodeDetectionResult,
  QrCodeUrlValidationResult,
  QrCodeVerificationOutcome,
} from "./types";

const TRUSTED_DOMAINS = ["autenticidade.saude.gov.br", "cfm.org.br", "gov.br"];

export interface QrCodeVerificationService {
  detectQrCode(file: { buffer: Buffer }): Promise<QrCodeDetectionResult>;
  validateAuthenticationUrl(url: string | null): Promise<QrCodeUrlValidationResult>;
  comparePageDataWithExtractedData(
    pageData: Record<string, unknown> | null,
    extractedData: Record<string, unknown>,
  ): Promise<QrCodeVerificationOutcome>;
}

/**
 * Mock QR Code + authentication-link verification. A real implementation
 * detects the QR via an image/PDF decoder (e.g. zxing/jsQR), resolves the
 * authentication URL server-side with a fetch that never follows
 * attacker-controlled redirects blindly, and scrapes the resulting page to
 * cross-check the fields it claims to authenticate.
 */
export class MockQrCodeVerificationService implements QrCodeVerificationService {
  async detectQrCode(_file: { buffer: Buffer }): Promise<QrCodeDetectionResult> {
    await simulateLatency(200, 600);
    const found = Math.random() < 0.65;
    return {
      found,
      content: found ? "https://autenticidade.saude.gov.br/verificar/482913" : null,
    };
  }

  async validateAuthenticationUrl(url: string | null): Promise<QrCodeUrlValidationResult> {
    await simulateLatency(400, 1200);
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
    const reachable = weightedPick([
      { value: true, weight: 85 },
      { value: false, weight: 15 },
    ]);

    return {
      domain,
      isDomainTrusted,
      httpStatus: reachable ? 200 : randomInt(500, 599),
      reachable,
      extractedPageData: reachable
        ? { patientNameMasked: "M*** S****", issueDateMatches: Math.random() > 0.15 }
        : null,
    };
  }

  async comparePageDataWithExtractedData(
    pageData: Record<string, unknown> | null,
    _extractedData: Record<string, unknown>,
  ): Promise<QrCodeVerificationOutcome> {
    await simulateLatency(150, 400);
    if (!pageData) {
      return { status: "UNREACHABLE", matchScore: null, notes: "Não foi possível carregar a página de autenticação." };
    }
    if (pageData.issueDateMatches === false) {
      return {
        status: "DATA_MISMATCH",
        matchScore: randomInt(20, 50),
        notes: "Os dados retornados pela página de autenticação não coincidem com o documento.",
      };
    }
    return { status: "VALID", matchScore: randomInt(90, 100), notes: null };
  }
}

export const qrCodeVerificationService: QrCodeVerificationService =
  new MockQrCodeVerificationService();
