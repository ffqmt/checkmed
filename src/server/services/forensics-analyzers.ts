import sharp from "sharp";
import exifr from "exifr";
import { PDFDocument, PDFDict, PDFName, PDFRawStream } from "pdf-lib";

export type ForensicFinding = { area: string; description: string; severity: "info" | "low" | "medium" | "high" };
export type SubScore = { score: number; findings: ForensicFinding[] };

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

const EDITING_SOFTWARE_PATTERN =
  /photoshop|gimp|canva|snapseed|picsart|paint\.net|pixlr|inpaint|remove\.bg|fotor|affinity photo|lightroom/i;

// Tools sometimes (not always — many strip this) self-report in metadata.
// Absence proves nothing; presence is a real, free signal worth surfacing.
const AI_TOOL_SIGNATURE_PATTERN =
  /midjourney|dall-?e|stable diffusion|adobe firefly|leonardo\.?ai|ideogram|runway|flux\.1|imagen|sora/i;

/**
 * PDF metadata forensics: Producer/Creator strings, creation-vs-modification
 * date gap, and count of incremental save revisions (each PDF edit-and-resave
 * appends a new xref/trailer + "%%EOF" marker instead of rewriting the file).
 */
export async function analyzePdfMetadata(buffer: Buffer): Promise<SubScore & { pdfDoc: PDFDocument | null }> {
  const findings: ForensicFinding[] = [];
  let score = 0;

  let pdfDoc: PDFDocument | null = null;
  try {
    pdfDoc = await PDFDocument.load(buffer, { updateMetadata: false, ignoreEncryption: true });
  } catch {
    return {
      score: 0,
      findings: [{ area: "Metadados", description: "Não foi possível interpretar a estrutura do PDF para análise de metadados.", severity: "low" }],
      pdfDoc: null,
    };
  }

  const producer = pdfDoc.getProducer() ?? "";
  const creator = pdfDoc.getCreator() ?? "";
  if (EDITING_SOFTWARE_PATTERN.test(producer) || EDITING_SOFTWARE_PATTERN.test(creator)) {
    score += 45;
    findings.push({
      area: "Metadados",
      description: `Metadados do arquivo indicam processamento por software de edição de imagem (${producer || creator}).`,
      severity: "high",
    });
  }

  const creationDate = pdfDoc.getCreationDate();
  const modificationDate = pdfDoc.getModificationDate();
  if (creationDate && modificationDate) {
    const diffHours = (modificationDate.getTime() - creationDate.getTime()) / 3_600_000;
    if (diffHours > 24) {
      score += 20;
      findings.push({
        area: "Metadados",
        description: `O arquivo foi modificado aproximadamente ${Math.round(diffHours / 24)} dia(s) após a data de criação original registrada nos metadados.`,
        severity: "medium",
      });
    }
  }

  if (AI_TOOL_SIGNATURE_PATTERN.test(producer) || AI_TOOL_SIGNATURE_PATTERN.test(creator)) {
    findings.push({
      area: "Geração por IA",
      description: `Metadados citam uma ferramenta de geração de imagem por IA (${producer || creator}).`,
      severity: "high",
    });
  }

  return { score: clamp(score), findings, pdfDoc };
}

/** Each incremental PDF save appends a new revision instead of rewriting the file — count them via their "%%EOF" markers. */
export function countPdfRevisions(buffer: Buffer): number {
  const text = buffer.toString("latin1");
  const matches = text.match(/%%EOF/g);
  return matches ? matches.length : 1;
}

export function analyzePdfLayers(buffer: Buffer): SubScore {
  const revisions = countPdfRevisions(buffer);
  if (revisions <= 1) return { score: 0, findings: [] };
  return {
    score: clamp((revisions - 1) * 35),
    findings: [
      {
        area: "Camadas do PDF",
        description: `O arquivo contém ${revisions} revisões salvas (múltiplos marcadores de fim de arquivo) — indício de edição após a geração inicial do documento.`,
        severity: revisions > 2 ? "high" : "medium",
      },
    ],
  };
}

/** Distinct embedded font families — a one-page certificate legitimately using many unrelated font families is unusual and can indicate content spliced in from elsewhere. */
export function analyzePdfFonts(pdfDoc: PDFDocument | null): SubScore {
  if (!pdfDoc) {
    return { score: 0, findings: [] };
  }
  const families = new Set<string>();
  try {
    for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFDict) {
        const subtype = obj.get(PDFName.of("Subtype"));
        if (subtype && /Type0|Type1|TrueType|MMType1/.test(subtype.toString())) {
          const baseFont = obj.get(PDFName.of("BaseFont"));
          if (baseFont) {
            const raw = baseFont.toString().replace(/^\//, "");
            families.add(raw.replace(/^[A-Z]{6}\+/, ""));
          }
        }
      }
    }
  } catch {
    return { score: 0, findings: [] };
  }

  if (families.size <= 3) return { score: 0, findings: [] };

  return {
    score: clamp((families.size - 3) * 15),
    findings: [
      {
        area: "Tipografia",
        description: `O documento utiliza ${families.size} famílias de fonte distintas — mais do que o esperado para um documento deste tipo, o que pode indicar conteúdo combinado de fontes diferentes.`,
        severity: families.size > 5 ? "high" : "medium",
      },
    ],
  };
}

/** Best-effort: pull the largest JPEG-encoded (DCTDecode) image embedded in a PDF so it can be run through the same ELA pass used for direct image uploads. Returns null for text/vector-only PDFs — nothing to analyze pixel-wise. */
export function extractLargestEmbeddedJpeg(pdfDoc: PDFDocument | null): Buffer | null {
  if (!pdfDoc) return null;
  try {
    let largest: Uint8Array | null = null;
    for (const [, obj] of pdfDoc.context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream) {
        const subtype = obj.dict.get(PDFName.of("Subtype"));
        const filter = obj.dict.get(PDFName.of("Filter"));
        const filterStr = filter?.toString() ?? "";
        if (subtype?.toString() === "/Image" && filterStr.includes("DCTDecode")) {
          if (!largest || obj.contents.length > largest.length) largest = obj.contents;
        }
      }
    }
    return largest ? Buffer.from(largest) : null;
  } catch {
    return null;
  }
}

/** EXIF/XMP metadata forensics for direct JPG/PNG uploads — same editing-software and AI-tool signature checks as the PDF path. */
export async function analyzeImageMetadata(buffer: Buffer): Promise<SubScore> {
  try {
    const exif = await exifr.parse(buffer, { xmp: true, iptc: true }).catch(() => null);
    if (!exif) return { score: 0, findings: [] };

    const software = String(exif.Software ?? exif.CreatorTool ?? exif.HistorySoftwareAgent ?? "");
    if (EDITING_SOFTWARE_PATTERN.test(software)) {
      return {
        score: 45,
        findings: [
          {
            area: "Metadados",
            description: `Metadados EXIF/XMP indicam que a imagem foi processada em ${software}.`,
            severity: "high",
          },
        ],
      };
    }
    if (AI_TOOL_SIGNATURE_PATTERN.test(software)) {
      return {
        score: 60,
        findings: [
          {
            area: "Geração por IA",
            description: `Metadados citam uma ferramenta de geração de imagem por IA (${software}).`,
            severity: "high",
          },
        ],
      };
    }
    return { score: 0, findings: [] };
  } catch {
    return { score: 0, findings: [] };
  }
}

// NOT CURRENTLY CALLED from forensics.service.ts — validated against a
// deliberately-tampered test image and found unreliable (see git history /
// project notes): eliminates the false-positive-on-text problem that plain
// ELA had, but then missed an obvious planted splice too. Kept here,
// disabled, as the documented starting point for whoever revisits this
// before Phase 2 (specialized vendor) lands — re-wire it in
// produceTechnicalFindings once it's been validated on real (not synthetic)
// tampered documents, or replace it outright with a vendor call.
export type ElaResult = {
  /** Fraction of blocks whose best-matching recompression quality differs from the page's dominant quality — i.e. genuinely double-compressed content, not just detailed content. */
  mismatchBlockRatio: number;
  /** True when the mismatching blocks form one compact, contiguous region (a pasted patch) rather than being scattered across the page (ordinary text/detail). */
  hasCompactMismatchCluster: boolean;
  /** Size of the largest compact mismatch cluster, as a fraction of the whole page. */
  largestClusterAreaRatio: number;
};

const GHOST_CANDIDATE_QUALITIES = [45, 55, 65, 75, 85, 95];
const BLOCK_SIZE = 16;

/**
 * JPEG Ghost analysis (Farid, 2009), simplified: re-save the image at several
 * candidate qualities and, for every block, find which quality makes it look
 * most like a *fresh* single compression (a block re-encoded at its own
 * original quality changes the least). Blocks copied in from a
 * differently-compressed source carry their donor's quality fingerprint, so
 * they disagree with the page's dominant quality — but only there. Unlike
 * plain Error Level Analysis, this doesn't flag ordinary text/detail, since
 * genuine same-page content shares one compression history regardless of how
 * much high-frequency detail it has.
 */
export async function computeELA(buffer: Buffer): Promise<ElaResult | null> {
  try {
    const base = sharp(buffer).rotate();
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return null;

    const maxDim = 1000;
    const scale = Math.min(1, maxDim / Math.max(meta.width, meta.height));
    const width = Math.max(1, Math.round(meta.width * scale));
    const height = Math.max(1, Math.round(meta.height * scale));
    if (width < BLOCK_SIZE * 4 || height < BLOCK_SIZE * 4) return null;

    const resized = base.resize(width, height);
    const { data: origData, info } = await resized.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const channels = info.channels;
    const blocksX = Math.ceil(info.width / BLOCK_SIZE);
    const blocksY = Math.ceil(info.height / BLOCK_SIZE);
    const totalBlocks = blocksX * blocksY;

    // For each candidate quality, compute the per-block mean absolute diff against the original.
    const errorByQuality: Float64Array[] = [];
    for (const quality of GHOST_CANDIDATE_QUALITIES) {
      const recompressed = await resized.clone().jpeg({ quality }).toBuffer();
      const { data: reqData } = await sharp(recompressed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

      const sums = new Float64Array(totalBlocks);
      const counts = new Uint32Array(totalBlocks);
      for (let y = 0; y < info.height; y++) {
        const bRow = Math.floor(y / BLOCK_SIZE);
        for (let x = 0; x < info.width; x++) {
          const idx = (y * info.width + x) * channels;
          const diff =
            Math.abs(origData[idx] - reqData[idx]) +
            Math.abs(origData[idx + 1] - reqData[idx + 1]) +
            Math.abs(origData[idx + 2] - reqData[idx + 2]);
          const bIdx = bRow * blocksX + Math.floor(x / BLOCK_SIZE);
          sums[bIdx] += diff;
          counts[bIdx] += 1;
        }
      }
      const means = new Float64Array(totalBlocks);
      for (let i = 0; i < totalBlocks; i++) means[i] = counts[i] ? sums[i] / counts[i] : 0;
      errorByQuality.push(means);
    }

    // Best-fit quality index per block = the one with the lowest error (closest to a single fresh compression).
    const bestFitIndex = new Int8Array(totalBlocks);
    for (let b = 0; b < totalBlocks; b++) {
      let bestQ = 0;
      let bestErr = Infinity;
      for (let q = 0; q < GHOST_CANDIDATE_QUALITIES.length; q++) {
        if (errorByQuality[q][b] < bestErr) {
          bestErr = errorByQuality[q][b];
          bestQ = q;
        }
      }
      bestFitIndex[b] = bestQ;
    }

    // The page's dominant compression history = the mode of best-fit qualities.
    const histogram = new Array(GHOST_CANDIDATE_QUALITIES.length).fill(0);
    for (let b = 0; b < totalBlocks; b++) histogram[bestFitIndex[b]]++;
    const dominantIndex = histogram.indexOf(Math.max(...histogram));

    const isMismatch = new Uint8Array(totalBlocks);
    for (let b = 0; b < totalBlocks; b++) {
      isMismatch[b] = Math.abs(bestFitIndex[b] - dominantIndex) >= 2 ? 1 : 0;
    }
    const mismatchBlockRatio = isMismatch.reduce((a, b) => a + b, 0) / totalBlocks;

    const { largestClusterSize } = findLargestConnectedCluster(isMismatch, blocksX, blocksY);
    const largestClusterAreaRatio = largestClusterSize / totalBlocks;
    // A genuine pasted patch is a small, solid, contiguous region — not a sliver of noise and not most of the page.
    const hasCompactMismatchCluster = largestClusterAreaRatio >= 0.01 && largestClusterAreaRatio <= 0.3;

    return { mismatchBlockRatio, hasCompactMismatchCluster, largestClusterAreaRatio };
  } catch {
    return null;
  }
}

/** 4-connected flood fill over the block grid to find the largest contiguous group of flagged blocks. */
function findLargestConnectedCluster(flags: Uint8Array, blocksX: number, blocksY: number): { largestClusterSize: number } {
  const visited = new Uint8Array(flags.length);
  let largest = 0;

  for (let start = 0; start < flags.length; start++) {
    if (!flags[start] || visited[start]) continue;
    let size = 0;
    const stack = [start];
    visited[start] = 1;
    while (stack.length) {
      const idx = stack.pop()!;
      size++;
      const x = idx % blocksX;
      const y = Math.floor(idx / blocksX);
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < blocksX - 1 ? idx + 1 : -1,
        y > 0 ? idx - blocksX : -1,
        y < blocksY - 1 ? idx + blocksX : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && flags[n] && !visited[n]) {
          visited[n] = 1;
          stack.push(n);
        }
      }
    }
    if (size > largest) largest = size;
  }

  return { largestClusterSize: largest };
}

export function scoreFromEla(ela: ElaResult | null): {
  compression: SubScore;
  stampSignature: SubScore;
} {
  if (!ela) {
    return { compression: { score: 0, findings: [] }, stampSignature: { score: 0, findings: [] } };
  }

  // Overall compression score tracks how much of the page disagrees with its own dominant compression history at all.
  const compressionScore = clamp(ela.mismatchBlockRatio * 250);
  const compressionFindings: ForensicFinding[] =
    compressionScore >= 15
      ? [
          {
            area: "Compressão de imagem",
            description: "Parte do documento apresenta um histórico de compressão JPEG diferente do restante da página — possível indício de conteúdo inserido a partir de outra imagem.",
            severity: compressionScore >= 50 ? "high" : compressionScore >= 25 ? "medium" : "low",
          },
        ]
      : [];

  // The stamp/signature signal specifically requires a compact, contiguous mismatched region — not scattered noise.
  const stampScore = ela.hasCompactMismatchCluster ? clamp(40 + ela.largestClusterAreaRatio * 200) : 0;
  const stampFindings: ForensicFinding[] =
    stampScore > 0
      ? [
          {
            area: "Assinatura/Carimbo",
            description: `Uma região compacta do documento (aprox. ${Math.round(ela.largestClusterAreaRatio * 100)}% da página) apresenta histórico de compressão diferente do restante — consistente com um carimbo, assinatura ou campo colado de outra fonte.`,
            severity: stampScore >= 60 ? "high" : "medium",
          },
        ]
      : [];

  return {
    compression: { score: compressionScore, findings: compressionFindings },
    stampSignature: { score: stampScore, findings: stampFindings },
  };
}
