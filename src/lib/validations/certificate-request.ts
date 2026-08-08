import { z } from "zod";

export const createCertificateRequestSchema = z.object({
  employeeName: z.string().min(3, "Informe o nome completo do colaborador"),
  employeeDocument: z
    .string()
    .min(11, "Informe um CPF válido")
    .max(14, "Informe um CPF válido"),
  employeeRegistration: z.string().optional(),
  employeeEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  receivedByCompanyAt: z.coerce.date(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  consentOrLegalBasis: z
    .string()
    .min(1, "Selecione a base legal para o tratamento dos dados"),
  treatmentPurpose: z
    .string()
    .min(1, "Informe a finalidade do tratamento dos dados"),
});

export type CreateCertificateRequestInput = z.infer<
  typeof createCertificateRequestSchema
>;

export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
