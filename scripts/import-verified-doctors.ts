import { readFileSync } from "fs";
import { prisma } from "../src/lib/prisma";

type Parsed = { name: string; crm: string; uf: string; situacao: string | null; especialidade: string | null };

function parseBlock(block: string): Parsed | null {
  const lines = block.split("\n").map((l) => l.trim());
  const name = lines[0];
  const crmLine = lines.find((l) => l.startsWith("CRM:"));
  const situacaoLine = lines.find((l) => l.startsWith("Situação:"));
  if (!name || !crmLine) return null;

  const crmMatch = crmLine.match(/CRM:\s*(\d+)\s*\/\s*([A-Z]{2})/);
  if (!crmMatch) return null;
  const [, crm, uf] = crmMatch;

  const situacao = situacaoLine ? situacaoLine.replace("Situação:", "").trim() || null : null;

  const specStart = lines.findIndex((l) => l.startsWith("Especialidades/Áreas de Atuação:"));
  const addrStart = lines.findIndex((l) => l.startsWith("Endereço:"));
  let especialidade: string | null = null;
  if (specStart !== -1 && addrStart !== -1 && addrStart > specStart) {
    const specLines = lines.slice(specStart + 1, addrStart).filter(Boolean);
    const joined = specLines.join("; ");
    especialidade = /sem especialidade registrada/i.test(joined) || !joined ? null : joined;
  }

  return { name, crm, uf, situacao, especialidade };
}

async function main() {
  const path = process.argv[2] ?? "dados.txt";
  const raw = readFileSync(path, "utf-8");
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const parsed: Parsed[] = [];
  const failed: string[] = [];
  for (const block of blocks) {
    const p = parseBlock(block);
    if (p) parsed.push(p);
    else failed.push(block.split("\n")[0] ?? block.slice(0, 40));
  }

  console.log(`Blocos encontrados: ${blocks.length} | parseados: ${parsed.length} | falharam: ${failed.length}`);
  if (failed.length) console.log("Falharam:", failed);

  let created = 0;
  let updated = 0;
  for (const p of parsed) {
    const existing = await prisma.verifiedDoctor.findUnique({ where: { crm_uf: { crm: p.crm, uf: p.uf } } });
    await prisma.verifiedDoctor.upsert({
      where: { crm_uf: { crm: p.crm, uf: p.uf } },
      create: {
        crm: p.crm,
        uf: p.uf,
        officialName: p.name,
        registrationStatus: p.situacao,
        specialty: p.especialidade,
        sourceUrl: "https://portal.cfm.org.br/busca-medicos",
        notes: "Importado de consulta manual (dados copiados diretamente do portal do CFM).",
      },
      update: {
        officialName: p.name,
        registrationStatus: p.situacao,
        specialty: p.especialidade,
      },
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`Criados: ${created} | Atualizados: ${updated}`);
  for (const p of parsed) {
    console.log(`  - ${p.name} | CRM ${p.crm}/${p.uf} | ${p.situacao} | ${p.especialidade ?? "sem especialidade"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  });
