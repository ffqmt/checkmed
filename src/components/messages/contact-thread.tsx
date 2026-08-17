"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, outboundSenderLabel } from "@/lib/utils";
import { WHATSAPP_STATUS_TONE } from "@/lib/constants";
import { getContactThread, sendMessageToContact } from "@/server/actions/messages-inbox";

type ThreadData = Awaited<ReturnType<typeof getContactThread>>;

const POLL_INTERVAL_MS = 5000;

/** Render with `key={canonicalKey}` from the parent — forces a fresh mount (and fresh local state from `initialThread`) on contact switch instead of needing an effect to resync stale local state with a changed prop. */
export function ContactThread({ canonicalKey, initialThread }: { canonicalKey: string; initialThread: ThreadData }) {
  const [thread, setThread] = React.useState(initialThread);
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      setThread(await getContactThread(canonicalKey));
    } catch {
      // Transient failures just wait for the next poll.
    }
  }, [canonicalKey]);

  React.useEffect(() => {
    // Same reason as the per-request panel: delivery status and inbound
    // replies arrive via webhook, a request this open tab never sees.
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleSend() {
    if (!thread.defaultOrganization || !thread.lastKnownNumber) return;
    setPending(true);
    const result = await sendMessageToContact(thread.defaultOrganization.id, thread.lastKnownNumber, message);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Mensagem enviada.");
    setMessage("");
    await refresh();
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

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
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
            <p className="mt-1">{m.messageBody}</p>
            {m.errorMessage && <p className="mt-1 text-xs text-status-warning">{m.errorMessage}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          Enviando como: <span className="font-medium text-foreground">{thread.defaultOrganization?.name ?? "—"}</span>
        </p>
        <Textarea placeholder="Mensagem" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSend} disabled={pending || !message.trim() || !thread.defaultOrganization || !thread.lastKnownNumber}>
            <Send /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
