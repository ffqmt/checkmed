import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionPolicyForm } from "./decision-policy-form";

export default async function AdminDecisionPolicyPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { decisionPolicy: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Regras de decisão automática</h2>
        <p className="text-sm text-muted-foreground">
          Ajusta, por organização, a partir de qual score o sistema aprova automaticamente, pede revisão humana, aciona
          contato com a clínica ou escala para o supervisor. Isso muda o quão criterioso o sistema é — nunca como cada
          sinal individual (CRM divergente, QR inválido etc.) pesa no score. Sem configuração, vale o padrão global de
          sempre.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <CardTitle className="text-base">{org.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <DecisionPolicyForm
                organizationId={org.id}
                defaultAutoValidateMinScore={org.decisionPolicy?.autoValidateMinScore ?? 85}
                defaultHumanReviewMinScore={org.decisionPolicy?.humanReviewMinScore ?? 60}
                defaultClinicContactMaxScore={org.decisionPolicy?.clinicContactMaxScore ?? 60}
                defaultSupervisorReviewMaxScore={org.decisionPolicy?.supervisorReviewMaxScore ?? 35}
                defaultRequireDoctorValidated={org.decisionPolicy?.requireDoctorValidatedForAutoValidate ?? true}
                hasCustomPolicy={!!org.decisionPolicy}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
