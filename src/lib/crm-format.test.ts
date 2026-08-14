import { describe, it, expect } from "vitest";
import { checkCrmFormat } from "./crm-format";

describe("checkCrmFormat", () => {
  it("rejects missing crm or uf", () => {
    expect(checkCrmFormat(null, "SP")).toEqual({ plausible: false, reason: "missing" });
    expect(checkCrmFormat("12345", null)).toEqual({ plausible: false, reason: "missing" });
  });

  it("accepts a plausible plain-digit CRM/UF", () => {
    expect(checkCrmFormat("12345", "SP")).toEqual({ plausible: true, reason: "ok" });
  });

  it("accepts UF case-insensitively", () => {
    expect(checkCrmFormat("12345", "sp").plausible).toBe(true);
  });

  it("rejects a non-numeric CRM", () => {
    expect(checkCrmFormat("ABCDE", "SP")).toEqual({ plausible: false, reason: "not_numeric" });
  });

  it("rejects too few or too many digits", () => {
    expect(checkCrmFormat("12", "SP").reason).toBe("implausible_digit_count");
    expect(checkCrmFormat("12345678", "SP").reason).toBe("implausible_digit_count");
    expect(checkCrmFormat("123", "SP").plausible).toBe(true); // 3-digit floor is accepted
    expect(checkCrmFormat("1234567", "SP").plausible).toBe(true); // 7-digit ceiling is accepted
  });

  it("rejects a UF that isn't a real Brazilian state", () => {
    expect(checkCrmFormat("12345", "XX")).toEqual({ plausible: false, reason: "invalid_uf" });
  });

  it("KNOWN GAP: rejects real CFM provisional/revalidation CRM formats like '17987-P' as not_numeric — this check only recognizes plain-digit CRMs, so a real doctor with this format won't pass format plausibility even though the number is genuine (see import-verified-doctors.ts, which does accept these into the VerifiedDoctor cache)", () => {
    expect(checkCrmFormat("17987-P", "MT").reason).toBe("not_numeric");
  });
});
