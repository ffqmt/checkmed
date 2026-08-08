"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { sendWhatsAppTextMessage } from "@/server/actions/whatsapp";
import type { WhatsAppMessage } from "@prisma/client";

const STATUS_VARIANT: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  QUEUED: "neutral",
  SENT: "info",
  DELIVERED: "info",
  READ: "success",
  FAILED: "danger",
  RECEIVED: "neutral",
};

export function WhatsAppPanel({ requestId, messages }: { requestId: string; messages: WhatsAppMessage[] }) {
  const [to, setTo] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSend() {
    setPending(true);
    const result = await sendWhatsAppTextMessage(requestId, to, message);
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Mensagem enviada.");
    setMessage("");
    router.refresh();
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
                {m.direction === "OUTBOUND" ? `Para ${m.toNumber}` : `De ${m.fromNumber}`}
              </span>
              <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
            </div>
            <p className="mt-1">{m.messageBody}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border border-border p-3">
        <Input placeholder="Número de destino (com DDI/DDD)" value={to} onChange={(e) => setTo(e.target.value)} />
        <Textarea placeholder="Mensagem" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSend} disabled={pending || !to || !message}>
            <Send /> Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
