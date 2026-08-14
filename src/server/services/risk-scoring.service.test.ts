import { describe, it, expect } from "vitest";
import { DefaultRiskScoringService } from "./risk-scoring.service";
import type { RiskScoringInput, TechnicalFindings } from "./types";

const service = new DefaultRiskScoringService();

function baseInput(overrides: Partial<RiskScoringInput> = {}): RiskScoringInput {
  return {
    extractedData: null,
    ocrConfidence: null,
    cidValidation: null,
    doctorVerification: null,
    clinicVerification: null,
    qrCodeVerification: null,
    technicalAnalysis: null,
    similarityFindings: [],
    priorInconsistentMatch: false,
    ...overrides,
  };
}

function cleanTech(overrides: Partial<TechnicalFindings> = {}): TechnicalFindings {
  return {
    metadataRiskScore: 0,
    manipulationRiskScore: 0,
    aiGenerationRiskScore: 0,
    compressionInconsistencyScore: 0,
    fontInconsistencyScore: 0,
    layerInconsistencyScore: 0,
    signatureStampInconsistencyScore: 0,
    contentAuthenticityRiskScore: 0,
    findings: [],
    status: "COMPLETED",
    externalProviderName: null,
    externalProviderResponseJson: null,
    ...overrides,
  };
}

describe("DefaultRiskScoringService", () => {
  it("is a pure function: identical input always produces identical output", () => {
    const input = baseInput({ doctorVerification: { status: "VALIDATED", matchScore: 90 } });
    expect(service.score(input)).toEqual(service.score(input));
  });

  describe("the AI-generation score ceiling (the exact regression this session fixed twice)", () => {
    it("caps the score at 5 and forces CRITICAL risk level when aiGenerationRiskScore >= 90, regardless of otherwise-favorable signals", () => {
      const result = service.score(
        baseInput({
          ocrConfidence: 95,
          doctorVerification: { status: "VALIDATED", matchScore: 100 },
          clinicVerification: { status: "VALIDATED", matchScore: 100 },
          qrCodeVerification: { status: "VALID", matchScore: 100 },
          cidValidation: { code: "J06", valid: true },
          technicalAnalysis: cleanTech({ aiGenerationRiskScore: 99 }),
        }),
      );
      expect(result.score).toBe(5);
      expect(result.riskLevel).toBe("CRITICAL");
      expect(result.recommendation).toBe("SUPERVISOR_REVIEW");
    });

    it("names the AI-generation percentage explicitly in the summary instead of a generic message", () => {
      const result = service.score(baseInput({ technicalAnalysis: cleanTech({ aiGenerationRiskScore: 97 }) }));
      expect(result.summary).toContain("97%");
      expect(result.summary.toLowerCase()).toContain("inteligência artificial");
    });

    it("marks the POSSIBLE_AI_GENERATION alert as client-visible at the critical threshold", () => {
      const result = service.score(baseInput({ technicalAnalysis: cleanTech({ aiGenerationRiskScore: 92 }) }));
      const alert = result.alerts.find((a) => a.type === "POSSIBLE_AI_GENERATION");
      expect(alert?.severity).toBe("CRITICAL");
      expect(alert?.isClientVisible).toBe(true);
    });

    it("does not apply the ceiling just below the threshold (89%)", () => {
      const result = service.score(baseInput({ technicalAnalysis: cleanTech({ aiGenerationRiskScore: 89 }) }));
      expect(result.score).toBeGreaterThan(5);
      expect(result.alerts.find((a) => a.type === "POSSIBLE_AI_GENERATION")?.severity).not.toBe("CRITICAL");
    });
  });

  describe("recommendation routing", () => {
    it("recommends AUTO_VALIDATE only when doctor+clinic are both confirmed, score is high, and no high/critical alerts exist", () => {
      const result = service.score(
        baseInput({
          ocrConfidence: 95,
          doctorVerification: { status: "VALIDATED", matchScore: 100 },
          clinicVerification: { status: "VALIDATED", matchScore: 100 },
          qrCodeVerification: { status: "VALID", matchScore: 100 },
          cidValidation: { code: "J06", valid: true },
          technicalAnalysis: cleanTech(),
        }),
      );
      expect(result.recommendation).toBe("AUTO_VALIDATE");
      expect(result.score).toBeGreaterThan(85);
    });

    it("recommends SUPERVISOR_REVIEW when a doctor name/CRM divergence has a very low match score", () => {
      const result = service.score(baseInput({ doctorVerification: { status: "DIVERGENT", matchScore: 20 } }));
      expect(result.recommendation).toBe("SUPERVISOR_REVIEW");
    });

    it("recommends CLINIC_CONTACT when the doctor CRM isn't found, even with an otherwise-confirmed clinic", () => {
      // Clinic VALIDATED offsets enough score that we're testing the explicit
      // `doctor?.status === "NOT_FOUND"` clause, not just the score<60 fallback.
      const result = service.score(
        baseInput({
          doctorVerification: { status: "NOT_FOUND", matchScore: 0 },
          clinicVerification: { status: "VALIDATED", matchScore: 100 },
        }),
      );
      expect(result.recommendation).toBe("CLINIC_CONTACT");
    });

    it("recommends CLINIC_CONTACT (not INCONCLUSIVE) for a request with no verification data at all — score lands under 60", () => {
      const result = service.score(baseInput());
      expect(result.score).toBeLessThan(60);
      expect(result.recommendation).toBe("CLINIC_CONTACT");
    });

    it("DOCUMENTED GAP: INCONCLUSIVE appears unreachable under the current formula. It requires score > 85 while doctor is NOT VALIDATED-with-clinic-or-qr-confirmed — but doctor VALIDATED is the only contributor large enough to push score that high, and whenever it's paired with a validated clinic or valid QR (needed to cross 85), those are exactly the conditions AUTO_VALIDATE checks for. The single-contributor ceiling (doctor VALIDATED alone, everything else neutral) tops out at 72 — nowhere near 85. This isn't asserted as intentional; it's flagged so a future threshold change doesn't accidentally rely on a supposedly-reachable branch.", () => {
      const doctorOnly = service.score(baseInput({ doctorVerification: { status: "VALIDATED", matchScore: 100 } }));
      expect(doctorOnly.score).toBeLessThanOrEqual(85);
      expect(doctorOnly.recommendation).not.toBe("INCONCLUSIVE");
    });
  });

  describe("CID-10 validity", () => {
    it("a valid CID adds a positive indicator but does NOT change the score — only an invalid CID has a score effect", () => {
      const valid = service.score(baseInput({ cidValidation: { code: "J06", valid: true } }));
      const none = service.score(baseInput({ cidValidation: null }));
      expect(valid.score).toBe(none.score);
      expect(valid.positiveIndicators.some((p) => p.includes("CID"))).toBe(true);
      expect(none.positiveIndicators.some((p) => p.includes("CID"))).toBe(false);
    });

    it("an invalid CID does reduce the score relative to no CID at all", () => {
      const invalid = service.score(baseInput({ cidValidation: { code: "ZZ99", valid: false } }));
      const none = service.score(baseInput({ cidValidation: null }));
      expect(invalid.score).toBeLessThan(none.score);
    });

    it("penalizes an invalid CID and raises an (internal-only) alert", () => {
      const result = service.score(baseInput({ cidValidation: { code: "ZZ99", valid: false } }));
      const alert = result.alerts.find((a) => a.type === "CID_CODE_INVALID");
      expect(alert).toBeDefined();
      expect(alert?.isClientVisible).toBe(false);
      expect(alert?.description).toContain("ZZ99");
    });
  });

  describe("date consistency checks", () => {
    it("flags a future issue date as a client-visible HIGH alert", () => {
      const future = new Date(Date.now() + 30 * 86400000);
      const result = service.score(
        baseInput({ extractedData: { absenceDays: 2, certificateIssueDate: future, absenceStartDate: null, absenceEndDate: null } }),
      );
      const alert = result.alerts.find((a) => a.type === "FUTURE_ISSUE_DATE");
      expect(alert?.severity).toBe("HIGH");
      expect(alert?.isClientVisible).toBe(true);
    });

    it("flags a mismatch between absenceDays and the actual date range", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-02"); // 2 real days, but absenceDays claims 5
      const result = service.score(
        baseInput({ extractedData: { absenceDays: 5, certificateIssueDate: null, absenceStartDate: start, absenceEndDate: end } }),
      );
      expect(result.alerts.some((a) => a.type === "ABSENCE_PERIOD_INCONSISTENT")).toBe(true);
    });

    it("does not flag a consistent date range", () => {
      const start = new Date("2026-01-01");
      const end = new Date("2026-01-02"); // inclusive range = 2 days, matches absenceDays
      const result = service.score(
        baseInput({ extractedData: { absenceDays: 2, certificateIssueDate: null, absenceStartDate: start, absenceEndDate: end } }),
      );
      expect(result.alerts.some((a) => a.type === "ABSENCE_PERIOD_INCONSISTENT")).toBe(false);
    });
  });

  describe("similarity with prior cases", () => {
    it("applies the harshest penalty for an exact file match against a known-inconsistent prior case", () => {
      const result = service.score(
        baseInput({
          similarityFindings: [{ matchedRequestId: "x", matchType: "EXACT_FILE_HASH", similarityScore: 100, explanation: "" }],
          priorInconsistentMatch: true,
        }),
      );
      const alert = result.alerts.find((a) => a.type === "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT");
      expect(alert?.severity).toBe("CRITICAL");
      expect(alert?.isClientVisible).toBe(true);
      expect(result.recommendation).toBe("SUPERVISOR_REVIEW"); // hasCritical forces this
    });

    it("does not treat a similarity match to a clean prior case as a red flag", () => {
      const result = service.score(
        baseInput({
          similarityFindings: [{ matchedRequestId: "x", matchType: "TEXT_SIMILARITY", similarityScore: 80, explanation: "" }],
          priorInconsistentMatch: false,
        }),
      );
      const alert = result.alerts.find((a) => a.type === "SIMILAR_TO_PREVIOUS_INCONSISTENT_DOCUMENT");
      expect(alert?.severity).toBe("INFO");
      expect(alert?.isClientVisible).toBe(false);
    });
  });

  it("always clamps the final score into [0, 100]", () => {
    const veryBad = service.score(
      baseInput({
        doctorVerification: { status: "DIVERGENT", matchScore: 0 },
        clinicVerification: { status: "DIVERGENT", matchScore: 0 },
        qrCodeVerification: { status: "DATA_MISMATCH", matchScore: 0 },
        technicalAnalysis: cleanTech({ manipulationRiskScore: 100, aiGenerationRiskScore: 100, contentAuthenticityRiskScore: 100 }),
        similarityFindings: [{ matchedRequestId: "x", matchType: "EXACT_FILE_HASH", similarityScore: 100, explanation: "" }],
        priorInconsistentMatch: true,
      }),
    );
    expect(veryBad.score).toBeGreaterThanOrEqual(0);
    expect(veryBad.score).toBeLessThanOrEqual(100);
  });
});
