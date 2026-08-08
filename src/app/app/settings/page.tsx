import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotificationPreferencesForm } from "./notification-preferences-form";

export default async function ClientSettingsPage() {
  const session = await auth();

  const preference = await prisma.notificationPreference.findFirst({
    where: { organizationId: session!.user.organizationId!, userId: session!.user.id },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Configurações</h2>
        <p className="text-sm text-muted-foreground">Gerencie suas preferências de notificação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notificações</CardTitle>
          <CardDescription>Escolha em quais momentos você quer ser notificado sobre suas solicitações.</CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesForm
            defaultValues={{
              notifyOnRequestReceived: preference?.notifyOnRequestReceived ?? true,
              notifyOnProcessingStarted: preference?.notifyOnProcessingStarted ?? true,
              notifyOnWaitingExternalResponse: preference?.notifyOnWaitingExternalResponse ?? true,
              notifyOnCompleted: preference?.notifyOnCompleted ?? true,
              notifyOnInconsistency: preference?.notifyOnInconsistency ?? true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
