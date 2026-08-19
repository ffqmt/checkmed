"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateDecisionPolicy, resetDecisionPolicy } from "@/server/actions/decision-policy";

export function DecisionPolicyForm({
  organizationId,
  defaultAutoValidateMinScore,
  defaultHumanReviewMinScore,
  defaultClinicContactMaxScore,
  defaultSupervisorReviewMaxScore,
  defaultRequireDoctorValidated,
  hasCustomPolicy,
}: {
  organizationId: string;
  defaultAutoValidateMinScore: number;
  defaultHumanReviewMinScore: number;
  defaultClinicContactMaxScore: number;
  defaultSupervisorReviewMaxScore: number;
  defaultRequireDoctorValidated: boolean;
  hasCustomPolicy: boolean;
}) {
  const [autoValidateMinScore, setAutoValidateMinScore] = React.useState(defaultAutoValidateMinScore);
  const [humanReviewMinScore, setHumanReviewMinScore] = React.useState(defaultHumanReviewMinScore);
  const [clinicContactMaxScore, setClinicContactMaxScore] = React.useState(defaultClinicContactMaxScore);
  const [supervisorReviewMaxScore, setSupervisorReviewMaxScore] = React.useState(defaultSupervisorReviewMaxScore);
  const [requireDoctorValidated, setRequireDoctorValidated] = React.useState(defaultRequireDoctorValidated);
  const [pending, setPending] = React.useState(false);
  const router = useRouter();

  async function handleSave() {
    setPending(true);
    const result = await updateDecisionPolicy(organizationId, {
      autoValidateMinScore,
      humanReviewMinScore,
      clinicContactMaxScore,
      supervisorReviewMaxScore,
      requireDoctorValidatedForAutoValidate: requireDoctorValidated,
    });
    setPending(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Regras de decisão atualizadas.");
    router.refresh();
  }

  async function handleReset() {
    setPending(true);
    await resetDecisionPolicy(organizationId);
    setPending(false);
    toast.success("Voltou ao padrão global.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {hasCustomPolicy && <p className="text-xs text-status-warning">Esta organização usa regras próprias, diferentes do padrão global.</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Auto-validação a partir de</Label>
          <Input type="number" min={0} max={100} value={autoValidateMinScore} onChange={(e) => setAutoValidateMinScore(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Revisão humana a partir de</Label>
          <Input type="number" min={0} max={100} value={humanReviewMinScore} onChange={(e) => setHumanReviewMinScore(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Contato com clínica abaixo de</Label>
          <Input type="number" min={0} max={100} value={clinicContactMaxScore} onChange={(e) => setClinicContactMaxScore(Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Revisão de supervisor abaixo de</Label>
          <Input type="number" min={0} max={100} value={supervisorReviewMaxScore} onChange={(e) => setSupervisorReviewMaxScore(Number(e.target.value))} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="font-normal">Exigir médico confirmado no CFM para auto-validar</Label>
        <Switch checked={requireDoctorValidated} onCheckedChange={setRequireDoctorValidated} />
      </div>
      <div className="flex justify-end gap-2">
        {hasCustomPolicy && (
          <Button size="sm" variant="ghost" onClick={handleReset} disabled={pending}>
            Voltar ao padrão
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={pending}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
