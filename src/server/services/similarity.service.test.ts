import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { jaccardSimilarity, shingles, hammingDistanceHex, computePerceptualHash } from "./similarity.service";

describe("shingles", () => {
  it("produces overlapping 3-word windows", () => {
    const s = shingles("um dois tres quatro");
    expect(s).toEqual(new Set(["um dois tres", "dois tres quatro"]));
  });

  it("returns an empty set for text shorter than the shingle size", () => {
    expect(shingles("um dois").size).toBe(0);
  });
});

describe("jaccardSimilarity", () => {
  it("scores identical text at 100", () => {
    const text = "declaro para os devidos fins que o paciente foi atendido nesta unidade";
    expect(jaccardSimilarity(text, text)).toBe(100);
  });

  it("scores completely unrelated text at 0", () => {
    expect(jaccardSimilarity("um texto qualquer aqui", "outro assunto totalmente diferente sem relacao")).toBe(0);
  });

  it("scores a real same-template-different-subject pair in the 40-55% range", () => {
    // The exact fraud pattern this check targets: same boilerplate, name/CID/days swapped.
    const a =
      "declaro para os devidos fins que o(a) sr(a). maria luisa ferreira pinto foi atendido nesta unidade de saude apresentando quadro clinico compativel com cid-10 r51 necessitando de 02 dias de afastamento de suas atividades laborais";
    const b =
      "declaro para os devidos fins que o(a) sr(a). joao pedro silva foi atendido nesta unidade de saude apresentando quadro clinico compativel com cid-10 j11 necessitando de 03 dias de afastamento de suas atividades laborais";
    const score = jaccardSimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThanOrEqual(55);
  });

  it("returns 0 when either side is empty", () => {
    expect(jaccardSimilarity("", "algum texto aqui")).toBe(0);
    expect(jaccardSimilarity("algum texto aqui", "")).toBe(0);
  });
});

describe("hammingDistanceHex", () => {
  it("returns 0 for identical hashes", () => {
    expect(hammingDistanceHex("a1b2c3d4", "a1b2c3d4")).toBe(0);
  });

  it("counts every differing bit, not just differing hex digits", () => {
    // 0x0 = 0000, 0xf = 1111 -> 4 bits differ
    expect(hammingDistanceHex("0", "f")).toBe(4);
    // 0x0 = 0000, 0x1 = 0001 -> 1 bit differs
    expect(hammingDistanceHex("0", "1")).toBe(1);
  });

  it("treats mismatched lengths as maximally different rather than throwing", () => {
    expect(hammingDistanceHex("ab", "abcd")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("computePerceptualHash", () => {
  it("returns null for PDFs — no rasterizer in this pipeline", async () => {
    const hash = await computePerceptualHash(Buffer.from("not a real pdf"), "application/pdf");
    expect(hash).toBeNull();
  });

  it("produces the identical hash for the same image content", async () => {
    const image = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 30, b: 30 } } })
      .png()
      .toBuffer();
    const hashA = await computePerceptualHash(image, "image/png");
    const hashB = await computePerceptualHash(image, "image/png");
    expect(hashA).not.toBeNull();
    expect(hashA).toBe(hashB);
  });

  it("produces the all-1s hash for ANY uniform-color image — a documented aHash limitation, not a bug: every pixel equals the image's own average, so 'pixel >= average' is true everywhere regardless of the actual color", async () => {
    const black = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .png()
      .toBuffer();
    const white = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .png()
      .toBuffer();
    const hashBlack = await computePerceptualHash(black, "image/png");
    const hashWhite = await computePerceptualHash(white, "image/png");
    // Both solid colors collapse to the same all-1s hash — a real document
    // photo always has internal contrast (text/stamps/edges), so this only
    // bites a genuinely blank/degenerate image, not a real certificate scan.
    expect(hashBlack).toBe(hashWhite);
    expect(hammingDistanceHex(hashBlack!, hashWhite!)).toBe(0);
  });

  it("produces meaningfully different hashes for images with different internal spatial structure", async () => {
    // A hard vertical split (left black / right white) vs a hard horizontal
    // split (top black / bottom white) — same 50/50 black-white ratio, but
    // different spatial arrangement, which aHash should pick up on.
    const verticalSplit = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .composite([{ input: await sharp({ create: { width: 32, height: 64, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer(), left: 32, top: 0 }])
      .png()
      .toBuffer();
    const horizontalSplit = await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } } })
      .composite([{ input: await sharp({ create: { width: 64, height: 32, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer(), left: 0, top: 32 }])
      .png()
      .toBuffer();

    const hashVertical = await computePerceptualHash(verticalSplit, "image/png");
    const hashHorizontal = await computePerceptualHash(horizontalSplit, "image/png");
    expect(hashVertical).not.toBeNull();
    expect(hashHorizontal).not.toBeNull();
    expect(hashVertical).not.toBe(hashHorizontal);
    expect(hammingDistanceHex(hashVertical!, hashHorizontal!)).toBeGreaterThan(0);
  });
});
