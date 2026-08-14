import { Paperclip } from "lucide-react";
import { storageAdapter } from "@/server/services/storage.service";

export async function EvidenceFileLink({ file }: { file: { storageBucket: string; storagePath: string; originalFileName: string } }) {
  const signedUrl = await storageAdapter.getSignedUrl(file.storageBucket, file.storagePath, 600);
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
    >
      <Paperclip className="size-3.5" />
      {file.originalFileName}
    </a>
  );
}
