import { z } from "zod";

export const createUserSchema = z.object({
  organizationId: z.string().nullable().optional(),
  name: z.string().min(2, "Informe o nome completo"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  role: z.enum([
    "SUPER_ADMIN",
    "INTERNAL_ADMIN",
    "INTERNAL_SUPERVISOR",
    "INTERNAL_ANALYST",
    "CLIENT_ADMIN",
    "CLIENT_USER",
  ]),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateNotificationPreferenceSchema = z.object({
  notifyOnRequestReceived: z.boolean(),
  notifyOnProcessingStarted: z.boolean(),
  notifyOnWaitingExternalResponse: z.boolean(),
  notifyOnCompleted: z.boolean(),
  notifyOnInconsistency: z.boolean(),
});

export type UpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceSchema
>;
