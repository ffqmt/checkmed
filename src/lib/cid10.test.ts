import { describe, it, expect } from "vitest";
import { validateCid10 } from "./cid10";

describe("validateCid10", () => {
  it("rejects null/empty/whitespace as empty", () => {
    expect(validateCid10(null)).toEqual({ valid: false, reason: "empty" });
    expect(validateCid10("")).toEqual({ valid: false, reason: "empty" });
    expect(validateCid10("   ")).toEqual({ valid: false, reason: "empty" });
  });

  it("rejects gibberish/placeholder text as bad_format", () => {
    expect(validateCid10("cid").valid).toBe(false);
    expect(validateCid10("cid").reason).toBe("bad_format");
    expect(validateCid10("1234").valid).toBe(false);
    expect(validateCid10("ABC").valid).toBe(false);
  });

  it("accepts a plain valid code, case-insensitively", () => {
    expect(validateCid10("J06")).toEqual({ valid: true, reason: "ok" });
    expect(validateCid10("j06")).toEqual({ valid: true, reason: "ok" });
  });

  it("accepts the dotted-subcategory form but not a two-digit decimal", () => {
    expect(validateCid10("R51.0").valid).toBe(true);
    expect(validateCid10("R51.55").valid).toBe(false); // regex only allows one digit after the dot
  });

  it("respects a chapter's real gap — D49 doesn't exist between the two D ranges (0-48, 50-89)", () => {
    expect(validateCid10("D48")).toEqual({ valid: true, reason: "ok" });
    expect(validateCid10("D50")).toEqual({ valid: true, reason: "ok" });
    expect(validateCid10("D49").valid).toBe(false);
    expect(validateCid10("D49").reason).toBe("outside_known_chapter");
  });

  it("respects a chapter's non-zero floor — V starts at 01, not 00", () => {
    expect(validateCid10("V00").valid).toBe(false);
    expect(validateCid10("V01").valid).toBe(true);
  });

  it("rejects a letter with no chapter at all (e.g. U — not used by this classification)", () => {
    const result = validateCid10("U07");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("outside_known_chapter");
  });

  it("accepts the boundary of the last chapter (Z99)", () => {
    expect(validateCid10("Z99")).toEqual({ valid: true, reason: "ok" });
  });

  it("rejects a code with too many trailing digits to be a letter + 2-digit + 1-decimal shape", () => {
    expect(validateCid10("A1234").valid).toBe(false);
    expect(validateCid10("A1234").reason).toBe("bad_format");
  });
});
