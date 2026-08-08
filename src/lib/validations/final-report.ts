import { z } from "zod";

export const generateFinalReportSchema = z.object({
  requestId: z.string(),
  result: z.enum([
    "VALIDATED",
    "VALIDATED_WITH_REMARKS",
    "INCONCLUSIVE",
    "INCONSISTENT",
    "NOT_CONFIRMED",
    "NOT_RECOGNIZED_BY_INSTITUTION",
  ]),
  executiveSummary: z.string().min(10, "Descreva um resumo executivo do parecer"),
  limitations: z.string().optional(),
  clientVisibleNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type GenerateFinalReportInput = z.infer<typeof generateFinalReportSchema>;
