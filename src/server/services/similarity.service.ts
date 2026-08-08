import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { simulateLatency, randomInt } from "./mock-utils";
import type { FingerprintResult, SimilarityFinding } from "./types";

export interface DocumentSimilarityService {
  generateFingerprint(file: { buffer: Buffer }, extractedText: string): Promise<FingerprintResult>;
  findSimilarDocuments(requestId: string, fingerprint: FingerprintResult): Promise<SimilarityFinding[]>;
  explainSimilarity(finding: SimilarityFinding): string;
}

function hashOf(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Mock document-fingerprinting/similarity provider. Real perceptual/layout
 * hashing (pHash, SSIM on rendered pages, layout-graph hashing) would
 * replace generateFingerprint; findSimilarDocuments would run a
 * nearest-neighbor search (e.g. Hamming distance over stored hashes, or a
 * vector index) instead of the naive DB scan below.
 */
export class MockDocumentSimilarityService implements DocumentSimilarityService {
  async generateFingerprint(file: { buffer: Buffer }, extractedText: string): Promise<FingerprintResult> {
    await simulateLatency(200, 500);
    const fileHash = hashOf(file.buffer.toString("base64").slice(0, 5000));
    const normalizedText = extractedText.replace(/\s+/g, " ").trim().toLowerCase();
    return {
      fileHash,
      perceptualHash: hashOf(fileHash + "perceptual").slice(0, 16),
      layoutHash: hashOf(fileHash + "layout").slice(0, 16),
      textHash: hashOf(normalizedText).slice(0, 16),
      stampHash: Math.random() > 0.3 ? hashOf(fileHash + "stamp").slice(0, 16) : null,
      signatureHash: Math.random() > 0.3 ? hashOf(fileHash + "signature").slice(0, 16) : null,
      normalizedText,
    };
  }

  async findSimilarDocuments(requestId: string, fingerprint: FingerprintResult): Promise<SimilarityFinding[]> {
    await simulateLatency(300, 700);

    const others = await prisma.documentFingerprint.findMany({
      where: { requestId: { not: requestId } },
      take: 25,
      orderBy: { createdAt: "desc" },
    });

    const findings: SimilarityFinding[] = [];

    for (const other of others) {
      if (other.fileHash === fingerprint.fileHash) {
        findings.push({
          matchedRequestId: other.requestId,
          matchType: "EXACT_FILE_HASH",
          similarityScore: 100,
          explanation: "O arquivo enviado é idêntico, byte a byte, a um documento já analisado anteriormente.",
        });
        continue;
      }
      if (other.textHash === fingerprint.textHash) {
        findings.push({
          matchedRequestId: other.requestId,
          matchType: "TEXT_SIMILARITY",
          similarityScore: randomInt(88, 99),
          explanation: "O texto extraído coincide quase integralmente com outro documento já analisado.",
        });
        continue;
      }
      if (other.layoutHash === fingerprint.layoutHash && Math.random() < 0.15) {
        findings.push({
          matchedRequestId: other.requestId,
          matchType: "LAYOUT_SIMILARITY",
          similarityScore: randomInt(70, 90),
          explanation: "O layout do documento é altamente semelhante a outro caso analisado.",
        });
      }
    }

    return findings.slice(0, 5);
  }

  explainSimilarity(finding: SimilarityFinding): string {
    return finding.explanation;
  }
}

export const documentSimilarityService: DocumentSimilarityService =
  new MockDocumentSimilarityService();
