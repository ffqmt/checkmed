import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WhatsAppIntegrationForm } from "./whatsapp-integration-form";

export default async function AdminWhatsAppPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { whatsAppIntegration: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Integração WhatsApp</h2>
        <p className="text-sm text-muted-foreground">
          Configure o provedor de WhatsApp Business por organização. Com o provedor Meta Cloud API configurado
          (telefone + token abaixo), o envio é real. Sem configuração, o envio fica simulado — registrado, mas não sai
          de verdade — até que os dados de acesso sejam preenchidos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{org.name}</CardTitle>
                <Badge variant={org.whatsAppIntegration?.status === "ACTIVE" ? "success" : "neutral"}>
                  {org.whatsAppIntegration?.status ?? "Não configurado"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <WhatsAppIntegrationForm
                organizationId={org.id}
                defaultProvider={org.whatsAppIntegration?.provider ?? "META_CLOUD_API"}
                defaultPhoneNumberId={org.whatsAppIntegration?.phoneNumberId ?? ""}
                hasAccessToken={Boolean(org.whatsAppIntegration?.accessTokenEncrypted)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
