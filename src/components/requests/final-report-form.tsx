"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileCheck2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateFinalReport, suggestFinalReportDraft } from "@/server/actions/final-reports";
import { FINAL_RESULT_LABELS } from "@/lib/constants";

export function FinalReportForm({ requestId, suggestedResult }: { requestId: string; suggestedResult?: string }) {
  const [result, setResult] = React.useState(suggestedResult ?? "VALIDATED_WITH_REMARKS");
  const [summary, setSummary] = React.useState("");
  const [limitations, setLimitations] = React.useState("");
  const [clientNotes, setClientNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [suggesting, setSuggesting] = React.useState(false);
  const [aiSuggested, setAiSuggested] = React.useState(false);
  const router = useRouter();

  async function handleSuggest() {
    setSuggesting(true);
    try {
      const res = await suggestFinalReportDraft(requestId);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setResult(res.result);
      setSummary(res.executiveSummary);
      setLimitations(res.limitations || "");
      setClientNotes(res.clientVisibleNotes || "");
      setAiSuggested(true);
      toast.success("Sugestão gerada — revise antes de emitir.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a sugestão.");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit() {
    setPending(true);
    const res = await generateFinalReport({
      requestId,
      result,
      executiveSummary: summary,
      limitations: limitations || undefined,
      clientVisibleNotes: clientNotes || undefined,
    });
    setPending(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success(res?.requiresSupervisorApproval ? "Parecer emitido — aguardando aprovação do supervisor." : "Parecer final emitido.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {aiSuggested ? "Rascunho sugerido por IA — revise antes de emitir." : "Preencha manualmente ou peça uma sugestão inicial."}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleSuggest} disabled={suggesting}>
          <Sparkles /> {suggesting ? "Gerando..." : "Sugestão da IA"}
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label>Resultado</Label>
        <Select value={result} onValueChange={setResult}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FINAL_RESULT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Resumo executivo</Label>
        <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Descreva os métodos utilizados e a conclusão da análise." />
      </div>
      <div className="space-y-1.5">
        <Label>Limitações (opcional)</Label>
        <Textarea rows={2} value={limitations} onChange={(e) => setLimitations(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Observações visíveis ao cliente (opcional)</Label>
        <Textarea rows={2} value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={pending || summary.length < 10}>
          <FileCheck2 /> Emitir parecer
        </Button>
      </div>
    </div>
  );
}
