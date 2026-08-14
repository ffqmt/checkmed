import { z } from "zod";

export const createDataPrivacyRequestSchema = z.object({
  requestType: z.enum(["ACCESS", "CORRECTION", "ANONYMIZATION", "DELETION", "EXPORT"]),
  subjectName: z.string().min(2, "Informe o nome do titular"),
  subjectDocumentMasked: z.string().min(3, "Informe o documento (pode ser mascarado, ex.: ***.879.***-94)"),
  notes: z.string().optional(),
});

export type CreateDataPrivacyRequestInput = z.infer<typeof createDataPrivacyRequestSchema>;

export const updateDataPrivacyRequestSchema = z.object({
  id: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "REJECTED"]),
  notes: z.string().optional(),
});

export type UpdateDataPrivacyRequestInput = z.infer<typeof updateDataPrivacyRequestSchema>;
