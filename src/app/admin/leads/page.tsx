import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { getLeads } from "@/server/actions/leads";
import { LeadStatusSelect } from "./lead-status-select";

export default async function AdminLeadsPage() {
  const leads = await getLeads();
  const newCount = leads.filter((l) => l.status === "NEW").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Leads</h2>
        <p className="text-sm text-muted-foreground">
          {newCount > 0 ? `${newCount} lead(s) novo(s) aguardando contato.` : "Nenhum lead novo."} Enviados pelo formulário da
          página institucional.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum lead recebido ainda" />
      ) : (
        <div className="space-y-3">
          {leads.map((l) => (
            <Card key={l.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    {l.companyName} — {l.contactName}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {l.email}
                    {l.phone && ` · ${l.phone}`} · {formatDateTime(l.createdAt)}
                  </p>
                  {l.message && <p className="mt-2 text-sm text-muted-foreground">{l.message}</p>}
                </div>
                <LeadStatusSelect leadId={l.id} status={l.status} />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
