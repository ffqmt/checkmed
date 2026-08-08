import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { CreateApiKeyDialog } from "./create-api-key-dialog";
import { RevokeApiKeyButton } from "./revoke-api-key-button";

export default async function AdminApiKeysPage() {
  const [organizations, apiKeys] = await Promise.all([
    prisma.organization.findMany({ orderBy: { name: "asc" } }),
    prisma.apiKey.findMany({ orderBy: { createdAt: "desc" }, include: { organization: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">Chaves para integração com a API pública do MedCheck.</p>
        </div>
        <CreateApiKeyDialog organizations={organizations.map((o) => ({ id: o.id, name: o.name }))} />
      </div>

      <div className="space-y-2">
        {apiKeys.map((key) => (
          <Card key={key.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}••••••••••••••••••</p>
                <p className="text-xs text-muted-foreground">{key.organization.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {key.lastUsedAt ? `Usada em ${formatDateTime(key.lastUsedAt)}` : "Nunca utilizada"}
                </span>
                <Badge variant={key.status === "ACTIVE" ? "success" : "neutral"}>{key.status}</Badge>
                {key.status === "ACTIVE" && <RevokeApiKeyButton apiKeyId={key.id} />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
