import crypto from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import type { FingerprintResult, SimilarityFinding } from "./types";

export interface DocumentSimilarityService {
  generateFingerprint(file: { buffer: Buffer; mimeType: string; sha256Hash: string }, extractedText: string): Promise<FingerprintResult>;
  findSimilarDocuments(requestId: string, fingerprint: FingerprintResult): Promise<SimilarityFinding[]>;
  explainSimilarity(finding: SimilarityFinding): string;
}

const PHASH_GRID = 8; // 8x8 grayscale grid -> 64-bit average hash
const SHINGLE_SIZE = 3; // 3-word shingles for fuzzy text comparison
// Jaccard %, below this too weak a signal to surface. Calibrated against a
// same-template/different-name-CID-days case (the exact fraud pattern this
// check targets), which scored 48% — not a corpus-tuned number, since
// shared Brazilian medical-certificate boilerplate ("declaro para os
// devidos fins...") can itself inflate similarity between genuinely
// unrelated documents; revisit once enough real submissions accumulate to
// measure the actual false-positive rate.
const TEXT_SIMILARITY_THRESHOLD = 45;
const VISUAL_MAX_HAMMING = 10; // out of 64 bits — common aHash "likely similar" cutoff
const CANDIDATE_POOL = 100; // naive recent-N scan; no vector index in this codebase yet

/** Average hash (aHash): resize to a tiny grayscale grid, threshold each pixel against the grid's mean. Cheap, deterministic, no vendor — genuinely detects re-saved/re-compressed/lightly-cropped copies of the same image, unlike a hash of file bytes. */
export async function computePerceptualHash(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (mimeType === "application/pdf") return null; // no PDF rasterizer in this pipeline — see FingerprintResult
  try {
    const { data } = await sharp(buffer)
      .resize(PHASH_GRID, PHASH_GRID, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    let bits = "";
    for (const pixel of data) bits += pixel >= avg ? "1" : "0";
    let hex = "";
    for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4).padEnd(4, "0"), 2).toString(16);
    return hex;
  } catch {
    return null;
  }
}

export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export function shingles(text: string, size = SHINGLE_SIZE): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) result.add(words.slice(i, i + size).join(" "));
  return result;
}

/** Jaccard similarity over word shingles — real fuzzy comparison, not the strict hash-equality the exact-text check already covers below. Catches the same template reused with a different name/date/CID, which byte or exact-text hashing would miss entirely. */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = shingles(a);
  const setB = shingles(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const s of setA) if (setB.has(s)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

function hashOfNormalizedText(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * Real fingerprinting/similarity: exact-file dedup via the certificate's own
 * SHA-256, near-duplicate text detection via Jaccard similarity over word
 * shingles (falling back to nothing fancier — exact-normalized-text hash
 * equality already covers byte-identical text), and near-duplicate image
 * detection via a genuine average perceptual hash computed with sharp.
 *
 * Deliberately NOT computed: layout/stamp/signature similarity. This
 * pipeline has no bounding-box or region-detection data to base them on —
 * extraction returns plain text, and forensics.service.ts already disabled
 * the equivalent stamp/signature pixel check for the identical reason.
 * Faking those with a random score (the previous implementation's approach)
 * is exactly the kind of fabricated finding this app no longer ships.
 */
export class RealDocumentSimilarityService implements DocumentSimilarityService {
  async generateFingerprint(
    file: { buffer: Buffer; mimeType: string; sha256Hash: string },
    extractedText: string,
  ): Promise<FingerprintResult> {
    const normalizedText = extractedText.replace(/\s+/g, " ").trim().toLowerCase();
    const perceptualHash = await computePerceptualHash(file.buffer, file.mimeType);
    return {
      fileHash: file.sha256Hash,
      perceptualHash,
      layoutHash: null,
      textHash: hashOfNormalizedText(normalizedText),
      stampHash: null,
      signatureHash: null,
      normalizedText,
    };
  }

  async findSimilarDocuments(requestId: string, fingerprint: FingerprintResult): Promise<SimilarityFinding[]> {
    const others = await prisma.documentFingerprint.findMany({
      where: { requestId: { not: requestId } },
      select: { requestId: true, fileHash: true, textHash: true, normalizedText: true, perceptualHash: true },
      take: CANDIDATE_POOL,
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
          similarityScore: 100,
          explanation: "O texto extraído é idêntico ao de outro documento já analisado (mesmo conteúdo, arquivo diferente).",
        });
        continue;
      }

      if (other.normalizedText && fingerprint.normalizedText) {
        const textScore = jaccardSimilarity(fingerprint.normalizedText, other.normalizedText);
        if (textScore >= TEXT_SIMILARITY_THRESHOLD) {
          findings.push({
            matchedRequestId: other.requestId,
            matchType: "TEXT_SIMILARITY",
            similarityScore: textScore,
            explanation: `O texto extraído tem ${textScore}% de sobreposição com outro documento já analisado — pode ser o mesmo modelo/template reutilizado.`,
          });
          continue;
        }
      }

      if (fingerprint.perceptualHash && other.perceptualHash) {
        const distance = hammingDistanceHex(fingerprint.perceptualHash, other.perceptualHash);
        if (distance <= VISUAL_MAX_HAMMING) {
          const visualScore = Math.round(((64 - distance) / 64) * 100);
          findings.push({
            matchedRequestId: other.requestId,
            matchType: "VISUAL_SIMILARITY",
            similarityScore: visualScore,
            explanation: `A imagem do documento é visualmente muito parecida (${visualScore}%) com outro já analisado — pode ser o mesmo arquivo reaproveitado ou levemente editado.`,
          });
        }
      }
    }

    return findings.slice(0, 5);
  }

  explainSimilarity(finding: SimilarityFinding): string {
    return finding.explanation;
  }
}

export const documentSimilarityService: DocumentSimilarityService = new RealDocumentSimilarityService();
