import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export type StoredFile = {
  bucket: string;
  storagePath: string;
  sha256Hash: string;
};

export type SignedUploadTarget =
  | { provider: "supabase"; bucket: string; path: string; token: string }
  | { provider: "local"; uploadUrl: string };

export interface StorageAdapter {
  upload(bucket: string, filePath: string, buffer: Buffer, contentType: string): Promise<void>;
  download(bucket: string, filePath: string): Promise<Buffer>;
  getSignedUrl(bucket: string, filePath: string, expiresInSeconds: number): Promise<string>;
  /**
   * Vercel caps a Serverless Function's request body at 4.5MB, which cannot
   * be raised via config — a real phone photo of a certificate routinely
   * exceeds it. This returns a target the browser can upload to *directly*,
   * bypassing our own server entirely for the file bytes.
   */
  createSignedUploadUrl(bucket: string, filePath: string, expiresInSeconds: number): Promise<SignedUploadTarget>;
  remove(bucket: string, filePath: string): Promise<void>;
}

/** Real adapter — Supabase Storage via the service-role client. */
export class SupabaseStorageAdapter implements StorageAdapter {
  async upload(bucket: string, filePath: string, buffer: Buffer, contentType: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase não configurado");
    const { error } = await supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
  }

  async download(bucket: string, filePath: string): Promise<Buffer> {
    if (!supabaseAdmin) throw new Error("Supabase não configurado");
    const { data, error } = await supabaseAdmin.storage.from(bucket).download(filePath);
    if (error || !data) throw error ?? new Error("Falha ao baixar arquivo");
    return Buffer.from(await data.arrayBuffer());
  }

  async getSignedUrl(bucket: string, filePath: string, expiresInSeconds: number): Promise<string> {
    if (!supabaseAdmin) throw new Error("Supabase não configurado");
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);
    if (error || !data) throw error ?? new Error("Falha ao gerar URL assinada");
    return data.signedUrl;
  }

  async createSignedUploadUrl(bucket: string, filePath: string): Promise<SignedUploadTarget> {
    if (!supabaseAdmin) throw new Error("Supabase não configurado");
    const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(filePath);
    if (error || !data) throw error ?? new Error("Falha ao gerar URL de upload assinada");
    return { provider: "supabase", bucket, path: filePath, token: data.token };
  }

  async remove(bucket: string, filePath: string): Promise<void> {
    if (!supabaseAdmin) throw new Error("Supabase não configurado");
    await supabaseAdmin.storage.from(bucket).remove([filePath]);
  }
}

/**
 * Local filesystem fallback so `npm run dev` works without a live
 * Supabase project. Files land under `.local-storage/<bucket>/<path>` and
 * are served through /api/internal/files with a short-lived HMAC token
 * standing in for a signed URL. Swap to SupabaseStorageAdapter once
 * SUPABASE_* env vars are set — see README.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private root = path.join(process.cwd(), ".local-storage");

  async upload(bucket: string, filePath: string, buffer: Buffer, _contentType: string): Promise<void> {
    const full = path.join(this.root, bucket, filePath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
  }

  async getSignedUrl(bucket: string, filePath: string, expiresInSeconds: number): Promise<string> {
    const expires = Date.now() + expiresInSeconds * 1000;
    const secret = process.env.WEBHOOK_SECRET ?? "medcheck-local-dev-secret";
    const token = crypto
      .createHmac("sha256", secret)
      .update(`${bucket}:${filePath}:${expires}`)
      .digest("hex");
    const query = new URLSearchParams({ bucket, path: filePath, expires: String(expires), token });
    return `/api/internal/files?${query.toString()}`;
  }

  async remove(bucket: string, filePath: string): Promise<void> {
    const full = path.join(this.root, bucket, filePath);
    await fs.rm(full, { force: true });
  }

  async download(bucket: string, filePath: string): Promise<Buffer> {
    const full = path.join(this.root, bucket, filePath);
    return fs.readFile(full);
  }

  /** Local dev never sits behind Vercel's function body cap, so this just points at our own upload route with the same HMAC scheme as getSignedUrl. */
  async createSignedUploadUrl(bucket: string, filePath: string, expiresInSeconds: number): Promise<SignedUploadTarget> {
    const expires = Date.now() + expiresInSeconds * 1000;
    const secret = process.env.WEBHOOK_SECRET ?? "medcheck-local-dev-secret";
    const token = crypto
      .createHmac("sha256", secret)
      .update(`upload:${bucket}:${filePath}:${expires}`)
      .digest("hex");
    const query = new URLSearchParams({ bucket, path: filePath, expires: String(expires), token });
    return { provider: "local", uploadUrl: `/api/internal/files/upload?${query.toString()}` };
  }

  verifyUploadToken(bucket: string, filePath: string, expires: string, token: string): boolean {
    if (Date.now() > Number(expires)) return false;
    const secret = process.env.WEBHOOK_SECRET ?? "medcheck-local-dev-secret";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`upload:${bucket}:${filePath}:${expires}`)
      .digest("hex");
    return expected === token;
  }

  verifyToken(bucket: string, filePath: string, expires: string, token: string): boolean {
    if (Date.now() > Number(expires)) return false;
    const secret = process.env.WEBHOOK_SECRET ?? "medcheck-local-dev-secret";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${bucket}:${filePath}:${expires}`)
      .digest("hex");
    return expected === token;
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
export const storageAdapter: StorageAdapter = isSupabaseConfigured
  ? new SupabaseStorageAdapter()
  : localStorageAdapter;

export function sha256Of(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function buildStoragePath(requestId: string, originalFileName: string): string {
  const ext = path.extname(originalFileName) || "";
  return `${requestId}/${crypto.randomUUID()}${ext}`;
}

/** Same evidence-files bucket as buildStoragePath, but keyed by the WhatsApp contact rather than a requestId — a conversation attachment often isn't tied to any case. */
export function buildWhatsAppAttachmentPath(contactKey: string, originalFileName: string): string {
  const ext = path.extname(originalFileName) || "";
  return `whatsapp/${contactKey}/${crypto.randomUUID()}${ext}`;
}

/** For the new-request form's pre-fill step: the file is read once, before a request even exists, to auto-populate the employee name/CPF fields. Removed right after extraction — the real, permanent copy is uploaded again under buildStoragePath once the request is actually created. */
export function buildPreviewStoragePath(originalFileName: string): string {
  const ext = path.extname(originalFileName) || "";
  return `preview/${crypto.randomUUID()}${ext}`;
}
