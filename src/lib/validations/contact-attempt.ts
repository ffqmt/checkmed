import { z } from "zod";

export const createContactAttemptSchema = z.object({
  requestId: z.string(),
  contactType: z.enum(["PHONE", "EMAIL", "WHATSAPP", "PORTAL", "OTHER"]),
  contactTarget: z.string().min(1, "Informe a clínica/instituição contatada"),
  contactValue: z.string().min(1, "Informe o telefone, e-mail ou canal utilizado"),
  attemptedAt: z.coerce.date(),
  contactedPersonName: z.string().optional(),
  contactedPersonRole: z.string().optional(),
  result: z.enum([
    "CONFIRMED_ISSUANCE",
    "DENIED_ISSUANCE",
    "NOT_FOUND",
    "REQUESTED_PATIENT_AUTHORIZATION",
    "NO_RESPONSE",
    "INVALID_CONTACT",
    "CALL_BACK_LATER",
    "OTHER",
  ]),
  notes: z.string().optional(),
  isClientVisible: z.boolean().default(false),
  evidence: z
    .object({
      storagePath: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      fileSize: z.number(),
      sha256Hash: z.string(),
    })
    .optional(),
});

export type CreateContactAttemptInput = z.infer<typeof createContactAttemptSchema>;
