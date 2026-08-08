import crypto from "crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Authenticates a public API request via `Authorization: Bearer <key>` (or
 * `X-API-Key: <key>`). Keys are stored hashed (sha256) — never in plain
 * text — so authentication is a hash lookup, not a decrypt.
 */
export async function authenticateApiRequest(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const headerKey = request.headers.get("x-api-key");
  const rawKey = headerKey ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

  if (!rawKey) throw new ApiAuthError("Chave de API ausente. Envie via 'Authorization: Bearer <key>'.");

  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash }, include: { organization: true } });

  if (!apiKey || apiKey.status !== "ACTIVE") throw new ApiAuthError("Chave de API inválida ou revogada.");
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new ApiAuthError("Chave de API expirada.");

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return { organizationId: apiKey.organizationId, organization: apiKey.organization, apiKeyId: apiKey.id };
}
