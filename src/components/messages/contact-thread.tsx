"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Send, Paperclip, X, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AttachmentPreview } from "@/components/shared/attachment-preview";
import { formatDateTime, outboundSenderLabel } from "@/lib/utils";
import { WHATSAPP_STATUS_TONE } from "@/lib/constants";
import { getContactThread, sendMessageToContact, beginMessageAttachmentUpload } from "@/server/actions/messages-inbox";
import { uploadFileToTarget, storagePathFromUploadTarget } from "@/lib/upload-client";

type ThreadData = Awaited<ReturnType<typeof getContactThread>>;

const POLL_INTERVAL_MS = 5000;
const ATTACHMENT_ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

/** Render with `key={canonicalKey}` from the parent — forces a fresh mount (and fresh local state from `initialThread`) on contact switch instead of needing an effect to resync stale local state with a changed prop. */
export function ContactThread({ canonicalKey, initialThread }: { canonicalKey: string; initialThread: ThreadData }) {
  const [thread, setThread] = React.useState(initialThread);
  const [message, setMessage] = React.useState("");
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);
  const [hasNewMessages, setHasNewMessages] = React.useState(false);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const prevMessageCountRef = React.useRef(initialThread.messages.length);

  const isNearBottom = React.useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // The grew/near-bottom check runs inside the callback that fetches new
  // data (a poll tick or a post-send refresh), not in a useEffect reacting
  // to `thread` — calling setState directly from an effect body that just
  // watched `thread.messages.length` change is the exact anti-pattern
  // react-hooks/set-state-in-effect flags; doing the check here instead is
  // the "callback fired by an external system" shape the rule wants.
  const refresh = React.useCallback(async () => {
    try {
      const next = await getContactThread(canonicalKey);
      const grew = next.messages.length > prevMessageCountRef.current;
      prevMessageCountRef.current = next.messages.length;
      setThread(next);
      if (grew) {
        if (isNearBottom()) {
          scrollToBottom("smooth");
        } else {
          setHasNewMessages(true);
        }
      }
    } catch {
      // Transient failures just wait for the next poll.
    }
  }, [canonicalKey, isNearBottom, scrollToBottom]);

  React.useEffect(() => {
    // Same reason as the per-request panel: delivery status and inbound
    // replies arrive via webhook, a request this open tab never sees.
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Jump straight to the most recent message when a thread first opens —
  // without this, "near the bottom" (the signal above) would start out
  // false. Pure DOM scroll, no setState, so it's not subject to the same
  // effect rule.
  React.useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  function handleScroll() {
    if (isNearBottom()) setHasNewMessages(false);
  }

  async function handleSend() {
    if (!thread.defaultOrganization || !thread.lastKnownNumber) return;
    if (!message.trim() && !attachmentFile) return;
    setPending(true);
    try {
      let attachment: { storagePath: string; fileName: string; mimeType: string; fileSize: number } | undefined;
      if (attachmentFile) {
        const begin = await beginMessageAttachmentUpload(thread.lastKnownNumber, attachmentFile.name, attachmentFile.type, attachmentFile.size);
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

      const result = await sendMessageToContact(thread.defaultOrganization.id, thread.lastKnownNumber, message, attachment);
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
    <div className="flex h-full flex-col">
      {thread.relatedRequests.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-3">
          <span className="text-xs text-muted-foreground">Solicitações relacionadas:</span>
          {thread.relatedRequests.map((r) => (
            <Link key={r.id} href={`/ops/requests/${r.id}`}>
              <Badge variant="outline">{r.employeeName}</Badge>
            </Link>
          ))}
        </div>
      )}

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 space-y-2 overflow-y-auto p-4">
        {thread.messages.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensagem registrada.</p>}
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-md rounded-lg border border-border p-3 text-sm ${m.direction === "OUTBOUND" ? "ml-auto bg-primary/5" : "bg-muted/40"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {m.direction === "OUTBOUND" ? outboundSenderLabel(m) : thread.contactLabel}
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

      {hasNewMessages && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom("smooth");
            setHasNewMessages(false);
          }}
          className="flex items-center justify-center gap-1.5 border-t border-border bg-primary/10 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        >
          <ArrowDown className="size-3.5" />
          Há novas mensagens nesse chat
        </button>
      )}

      <div className="space-y-2 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Enviando como: <span className="font-medium text-foreground">{thread.defaultOrganization?.name ?? "—"}</span>
        </p>
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
          <Button
            size="sm"
            onClick={handleSend}
            disabled={pending || (!message.trim() && !attachmentFile) || !thread.defaultOrganization || !thread.lastKnownNumber}
          >
            <Send /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
