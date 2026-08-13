import sharp from "sharp";
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import { extractLargestEmbeddedJpeg } from "../forensics-analyzers";

/**
 * Real QR-code pixel decoding — the pipeline previously never looked at the
 * actual image for a QR code at all; it only trusted whatever URL the
 * extraction step (LLM or mock) claimed was printed on the document. This
 * decodes the real pixels so that claim can be checked against ground
 * truth, not assumed.
 */
export async function decodeQrFromDocument(buffer: Buffer, mimeType: string): Promise<string | null> {
  let imageBuffer: Buffer | null = null;

  if (mimeType === "application/pdf") {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false, ignoreEncryption: true });
      imageBuffer = extractLargestEmbeddedJpeg(pdfDoc);
    } catch {
      return null;
    }
  } else {
    imageBuffer = buffer;
  }

  if (!imageBuffer) return null;

  try {
    const base = sharp(imageBuffer).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return null;

    // jsQR works on raw pixels — cap dimensions for speed, a QR pattern
    // survives downscaling to well under this size.
    const maxDim = 1800;
    const scale = Math.min(1, maxDim / Math.max(meta.width, meta.height));
    const width = Math.max(1, Math.round(meta.width * scale));
    const height = Math.max(1, Math.round(meta.height * scale));

    const { data } = await base.resize(width, height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const result = jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: "attemptBoth" });
    return result?.data ?? null;
  } catch {
    return null;
  }
}

const PRIVATE_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^\[?::1\]?$/,
  /^\[?fc/i,
  /^\[?fe80/i,
];

/** Real reachability check with basic SSRF guards — the URL comes from an untrusted uploaded document. */
export async function checkUrlReachable(url: string): Promise<{ reachable: boolean; httpStatus: number | null }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { reachable: false, httpStatus: null };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { reachable: false, httpStatus: null };
  }
  if (PRIVATE_HOSTNAME_PATTERNS.some((p) => p.test(parsed.hostname))) {
    return { reachable: false, httpStatus: null };
  }

  try {
    const response = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "MedCheck-VerificationBot/1.0" },
    });
    // A redirect still proves the endpoint answers — treat 2xx/3xx as reachable, not just 2xx.
    return { reachable: response.status < 400, httpStatus: response.status };
  } catch {
    return { reachable: false, httpStatus: null };
  }
}
