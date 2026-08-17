"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/shared/attachment-preview";
import { formatDateTime, outboundSenderLabel } from "@/lib/utils";
import { WHATSAPP_STATUS_TONE } from "@/lib/constants";
import { sendWhatsAppTextMessage, getWhatsAppMessages } from "@/server/actions/whatsapp";
import { beginMessageAttachmentUpload } from "@/server/actions/messages-inbox";
import { uploadFileToTarget, storagePathFromUploadTarget } from "@/lib/upload-client";

type Messages = Awaited<ReturnType<typeof getWhatsAppMessages>>;

const POLL_INTERVAL_MS = 5000;
const ATTACHMENT_ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

export function WhatsAppPanel({ requestId, messages: initialMessages }: { requestId: string; messages: Messages }) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [to, setTo] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    try {
      setMessages(await getWhatsAppMessages(requestId));
    } catch {
      // Transient failures just wait for the next poll — no need to surface a toast for a background refresh.
    }
  }, [requestId]);

  React.useEffect(() => {
    // Delivery status and inbound replies arrive via webhook — a request
    // the open tab never sees — so nothing else would tell this page a
    // message's status changed or a reply came in.
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleSend() {
    if (!to || (!message.trim() && !attachmentFile)) return;
    setPending(true);
    try {
      let attachment: { storagePath: string; fileName: string; mimeType: string; fileSize: number } | undefined;
      if (attachmentFile) {
        const begin = await beginMessageAttachmentUpload(to, attachmentFile.name, attachmentFile.type, attachmentFile.size);
        if ("error" in begin) {
          toast.error(begin.error);
          return;
        }
        await uploadFileToTarget(begin.uploadTarget, attachmentFile);
        attachment = {
          storagePath: storagePathFromUploadTarget(begin.uploadTarget),
          fileName: attachmentFile.name,
          mimeType: attachmentFile.type,
          fileSize: attachmentFile.size,
        };
      }

      const result = await sendWhatsAppTextMessage(requestId, to, message, attachment);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Mensagem enviada.");
      setMessage("");
      setAttachmentFile(null);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-md rounded-lg border border-border p-3 text-sm ${m.direction === "OUTBOUND" ? "ml-auto bg-primary/5" : "bg-muted/40"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {m.direction === "OUTBOUND" ? outboundSenderLabel(m) : `De ${m.fromNumber}`}
              </span>
              <Badge variant={WHATSAPP_STATUS_TONE[m.status]}>{m.status}</Badge>
            </div>
            {m.messageBody && <p className="mt-1">{m.messageBody}</p>}
            {m.attachmentUrl && <AttachmentPreview url={m.attachmentUrl} fileName={m.attachmentFileName} mimeType={m.attachmentMimeType} />}
            {m.errorMessage && <p className="mt-1 text-xs text-status-warning">{m.errorMessage}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Input placeholder="Número de destino (com DDI/DDD)" value={to} onChange={(e) => setTo(e.target.value)} />
        <Textarea placeholder="Mensagem" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        <input
          ref={attachmentInputRef}
          type="file"
          accept={ATTACHMENT_ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
        />
        {attachmentFile && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="truncate">{attachmentFile.name}</span>
            <button type="button" onClick={() => setAttachmentFile(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => attachmentInputRef.current?.click()}>
            <Paperclip /> Anexar
          </Button>
          <Button size="sm" onClick={handleSend} disabled={pending || !to || (!message.trim() && !attachmentFile)}>
            <Send /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
