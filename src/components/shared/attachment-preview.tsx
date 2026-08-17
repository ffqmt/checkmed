"use client";

import { Paperclip } from "lucide-react";

/** Client-safe counterpart to evidence-file-link.tsx (which is a Server Component and can't be dropped into a client-rendered message bubble) — the signed URL is precomputed server-side and passed in as plain data instead of fetched here. */
export function AttachmentPreview({ url, fileName, mimeType }: { url: string; fileName: string | null; mimeType: string | null }) {
  const isImage = mimeType?.startsWith("image/") ?? false;
  const label = fileName ?? "Anexo";

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs expire, so this can't go through next/image's remote-pattern allowlist */}
        <img src={url} alt={label} className="max-h-48 rounded-md border border-border object-contain" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <Paperclip className="size-3.5" />
      {label}
    </a>
  );
}
