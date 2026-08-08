import { FileText } from "lucide-react";
import { storageAdapter } from "@/server/services/storage.service";
import { formatDateTime } from "@/lib/utils";

export async function DocumentViewer({
  file,
}: {
  file: {
    id: string;
    storageBucket: string;
    storagePath: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    sha256Hash: string;
    createdAt: Date;
  };
}) {
  const signedUrl = await storageAdapter.getSignedUrl(file.storageBucket, file.storagePath, 600);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <span className="font-medium">{file.originalFileName}</span>
          <span className="text-xs text-muted-foreground">({(file.fileSize / 1024).toFixed(0)} KB)</span>
        </div>
        <span className="text-xs text-muted-foreground">Enviado em {formatDateTime(file.createdAt)}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
        {file.mimeType === "application/pdf" ? (
          <iframe src={signedUrl} className="h-[70vh] w-full" title={file.originalFileName} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signedUrl} alt={file.originalFileName} className="max-h-[70vh] w-full object-contain" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">SHA-256: <span className="font-mono">{file.sha256Hash}</span></p>
    </div>
  );
}
