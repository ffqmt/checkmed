"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadDropzone } from "@/components/shared/file-upload-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCertificateRequest } from "@/server/actions/certificate-requests";

const LEGAL_BASES = [
  { value: "cumprimento_obrigacao_legal", label: "Cumprimento de obrigação legal (Art. 7º, II)" },
  { value: "execucao_contrato_trabalho", label: "Execução de contrato de trabalho (Art. 7º, V)" },
  { value: "interesse_legitimo", label: "Interesse legítimo do controlador (Art. 7º, IX)" },
  { value: "consentimento_titular", label: "Consentimento do titular (Art. 7º, I)" },
];

export function NewRequestForm() {
  const [state, formAction, pending] = useActionState(createCertificateRequest, undefined);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUploadDropzone name="file" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do colaborador</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="employeeName">Nome completo</Label>
            <Input id="employeeName" name="employeeName" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employeeDocument">CPF</Label>
            <Input id="employeeDocument" name="employeeDocument" placeholder="000.000.000-00" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employeeRegistration">Matrícula (opcional)</Label>
            <Input id="employeeRegistration" name="employeeRegistration" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="employeeEmail">E-mail do colaborador (opcional)</Label>
            <Input id="employeeEmail" name="employeeEmail" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="receivedByCompanyAt">Data de recebimento pela empresa</Label>
            <Input id="receivedByCompanyAt" name="receivedByCompanyAt" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Prioridade</Label>
            <Select name="priority" defaultValue="NORMAL">
              <SelectTrigger id="priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Base legal e finalidade (LGPD)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="consentOrLegalBasis">Base legal para o tratamento dos dados</Label>
            <Select name="consentOrLegalBasis" required>
              <SelectTrigger id="consentOrLegalBasis" className="w-full">
                <SelectValue placeholder="Selecione a base legal" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_BASES.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="treatmentPurpose">Finalidade do tratamento</Label>
            <Textarea
              id="treatmentPurpose"
              name="treatmentPurpose"
              placeholder="Ex.: validar a autenticidade do atestado apresentado para fins de abono de ausência."
              required
            />
          </div>
        </CardContent>
      </Card>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Enviar para validação
        </Button>
      </div>
    </form>
  );
}
