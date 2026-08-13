import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

const ALL_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export default async function AdminDoctorRegistryPage() {
  const [total, regularTotal, byUf, recent] = await Promise.all([
    prisma.verifiedDoctor.count(),
    prisma.verifiedDoctor.count({ where: { registrationStatus: "Regular" } }),
    prisma.verifiedDoctor.groupBy({
      by: ["uf"],
      _count: { _all: true },
      _max: { verifiedAt: true },
      orderBy: { uf: "asc" },
    }),
    prisma.verifiedDoctor.findMany({ orderBy: { verifiedAt: "desc" }, take: 8 }),
  ]);

  const byUfMap = new Map(byUf.map((r) => [r.uf, r]));
  const covered = ALL_UFS.filter((uf) => byUfMap.has(uf));
  const missing = ALL_UFS.filter((uf) => !byUfMap.has(uf));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cadastro interno de médicos (CRM)</h2>
        <p className="text-sm text-muted-foreground">
          Cache de médicos confirmados manualmente junto ao portal do CFM. Usado para validar automaticamente um CRM já
          verificado antes; sem entrada aqui, a validação de médico permanece honesta ("sem integração ainda") em vez de
          fabricar uma confirmação — ver <span className="font-medium">Verificação do médico</span> em cada solicitação.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total no cache</p>
            <p className="text-2xl font-semibold tabular-nums">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Com situação "Regular"</p>
            <p className="text-2xl font-semibold tabular-nums">{regularTotal}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Estados cobertos</p>
            <p className="text-2xl font-semibold tabular-nums">
              {covered.length} <span className="text-sm font-normal text-muted-foreground">/ {ALL_UFS.length}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobertura por UF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">UF</th>
                  <th className="pb-2 pr-4 font-medium">Médicos no cache</th>
                  <th className="pb-2 font-medium">Última verificação importada</th>
                </tr>
              </thead>
              <tbody>
                {byUf.map((r) => (
                  <tr key={r.uf} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 font-medium">{r.uf}</td>
                    <td className="py-2 pr-4 tabular-nums">{r._count._all}</td>
                    <td className="py-2 text-muted-foreground">
                      {r._max.verifiedAt ? formatDateTime(r._max.verifiedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {missing.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Ainda sem dados:</span>
              {missing.map((uf) => (
                <Badge key={uf} variant="outline">
                  {uf}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionados recentemente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">Nenhum médico verificado ainda.</p>}
          {recent.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium">{d.officialName}</p>
                <p className="text-xs text-muted-foreground">
                  CRM {d.crm}/{d.uf} · {d.specialty ?? "sem especialidade registrada"}
                </p>
              </div>
              <Badge variant={d.registrationStatus === "Regular" ? "success" : "warning"}>
                {d.registrationStatus ?? "—"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como adicionar mais estados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. Colete os dados de um estado em <span className="font-medium text-foreground">portal.cfm.org.br/busca-medicos</span> (busca
            manual ou o script de paginação já em uso) e salve o .txt em{" "}
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">data/cfm-raw/</span> no projeto.
          </p>
          <p>
            2. Rode{" "}
            <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              npx tsx scripts/import-verified-doctors.ts data/cfm-raw
            </span>{" "}
            — importa todos os .txt da pasta de uma vez (aceita tanto o separador de linha em branco quanto o de traços do
            script de paginação), sem passar pelos limites de tamanho de requisição da Vercel.
          </p>
          <p>Essa página é só para acompanhar a cobertura — a importação em massa continua sendo feita localmente, direto no banco.</p>
        </CardContent>
      </Card>
    </div>
  );
}
