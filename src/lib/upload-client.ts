"use client";

import { getBrowserSupabaseClient } from "./supabase-browser";
import type { SignedUploadTarget } from "@/server/services/storage.service";

/** Uploads directly to storage from the browser — the file body never touches our server, avoiding Vercel's 4.5MB Serverless Function body cap. */
export async function uploadFileToTarget(uploadTarget: SignedUploadTarget, file: File): Promise<void> {
  if (uploadTarget.provider === "supabase") {
    const { error } = await getBrowserSupabaseClient()
      .storage.from(uploadTarget.bucket)
      .uploadToSignedUrl(uploadTarget.path, uploadTarget.token, file);
    if (error) throw error;
  } else {
    const response = await fetch(uploadTarget.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!response.ok) throw new Error("Falha ao enviar o arquivo.");
  }
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** storagePath for the local-storage-fallback upload target lives in its own query string, not a field — this reads it back out consistently wherever it's needed. */
export function storagePathFromUploadTarget(uploadTarget: SignedUploadTarget): string {
  if (uploadTarget.provider === "supabase") return uploadTarget.path;
  return new URL(uploadTarget.uploadUrl, window.location.origin).searchParams.get("path")!;
}
