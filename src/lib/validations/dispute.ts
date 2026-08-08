import { z } from "zod";

export const createDisputeSchema = z.object({
  requestId: z.string(),
  reason: z.string().min(1, "Selecione o motivo da contestação"),
  description: z.string().min(10, "Descreva o motivo com mais detalhes"),
});

export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;

export const resolveDisputeSchema = z.object({
  disputeId: z.string(),
  status: z.enum(["IN_REVIEW", "WAITING_ADDITIONAL_INFORMATION", "RESOLVED", "REJECTED", "CANCELLED"]),
  resolution: z.string().optional(),
});

export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
