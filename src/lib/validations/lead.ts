import { z } from "zod";

export const submitLeadSchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa"),
  contactName: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().email("E-mail inválido"),
  phone: z.string().trim().optional(),
  message: z.string().trim().max(2000).optional(),
});

export type SubmitLeadInput = z.infer<typeof submitLeadSchema>;

export const updateLeadStatusSchema = z.object({
  leadId: z.string(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]),
});
