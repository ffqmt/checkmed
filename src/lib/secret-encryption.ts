import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Reversible encryption for third-party credentials we store per
 * organization (e.g. a WhatsApp Business access token) — unlike the API-key
 * hashing in server/actions/api-keys.ts, these need to be read back later to
 * actually call the provider, so a one-way hash won't do.
 */
function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SECRETS_ENCRYPTION_KEY não configurada — necessária para armazenar credenciais de integração.");
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) throw new Error("SECRETS_ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex) — gere com `openssl rand -hex 32`.");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("hex")).join(".");
}

export function decryptSecret(ciphertext: string): string {
  const [ivHex, authTagHex, dataHex] = ciphertext.split(".");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Formato de segredo criptografado inválido.");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
