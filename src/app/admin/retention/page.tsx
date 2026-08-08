import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RetentionForm } from "./retention-form";

export default async function AdminRetentionPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { dataRetentionPolicy: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Políticas de retenção</h2>
        <p className="text-sm text-muted-foreground">
          Defina por quanto tempo os dados de cada organização são mantidos, conforme a LGPD.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {organizations.map((org) => (
          <Card key={org.id}>
            <CardHeader>
              <CardTitle className="text-base">{org.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <RetentionForm
                organizationId={org.id}
                defaultRetentionDays={org.dataRetentionPolicy?.retentionDays ?? org.dataRetentionDays}
                defaultAutoAnonymize={org.dataRetentionPolicy?.autoAnonymize ?? false}
                defaultAutoDeleteFiles={org.dataRetentionPolicy?.autoDeleteFiles ?? false}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
