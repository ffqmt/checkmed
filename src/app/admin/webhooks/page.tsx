import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CreateWebhookDialog } from "./create-webhook-dialog";
import { WebhookActions } from "./webhook-actions";

export default async function AdminWebhooksPage() {
  const [organizations, endpoints] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.webhookEndpoint.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: true, deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">Endpoints notificados sobre eventos das solicitações.</p>
        </div>
        <CreateWebhookDialog organizations={organizations.map((o) => ({ id: o.id, name: o.name }))} />
      </div>

      <div className="space-y-2">
        {endpoints.map((endpoint) => (
          <Card key={endpoint.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium break-all">{endpoint.url}</p>
                  <p className="text-xs text-muted-foreground">{endpoint.organization.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={endpoint.status === "ACTIVE" ? "success" : "neutral"}>{endpoint.status}</Badge>
                  {endpoint.status === "ACTIVE" && <WebhookActions endpointId={endpoint.id} />}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(endpoint.eventsJson as string[]).map((ev) => (
                  <Badge key={ev} variant="outline">
                    {ev}
                  </Badge>
                ))}
              </div>
              {endpoint.deliveries[0] && (
                <p className="text-xs text-muted-foreground">
                  Última entrega: {endpoint.deliveries[0].status} em {formatDateTime(endpoint.deliveries[0].createdAt)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
