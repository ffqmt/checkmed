import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Informe o nome da organização"),
  legalName: z.string().min(2, "Informe a razão social"),
  tradeName: z.string().optional(),
  cnpj: z.string().min(14, "Informe um CNPJ válido"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  address: z.string().optional(),
  slaHours: z.coerce.number().int().min(1).default(48),
  dataRetentionDays: z.coerce.number().int().min(30).default(365),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TRIAL"]).default("TRIAL"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
