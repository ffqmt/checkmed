import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma";

type Parsed = { name: string; crm: string; uf: string; situacao: string | null; especialidade: string | null };

/**
 * Handles both source formats: a blank line between entries (manually
 * pasted from the site) or a line of dashes (the browser-console pagination
 * script's separator). Both get normalized to blank-line blocks first.
 */
function splitBlocks(raw: string): string[] {
  const normalized = raw.replace(/\n-{5,}\n?/g, "\n\n");
  return normalized
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

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

function resolveTxtFiles(path: string): string[] {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    return readdirSync(path)
      .filter((f) => f.toLowerCase().endsWith(".txt"))
      .map((f) => join(path, f));
  }
  return [path];
}

async function importFile(path: string) {
  const raw = readFileSync(path, "utf-8");
  const blocks = splitBlocks(raw);

  const parsed: Parsed[] = [];
  const failed: string[] = [];
  for (const block of blocks) {
    const p = parseBlock(block);
    if (p) parsed.push(p);
    else failed.push(block.split("\n")[0] ?? block.slice(0, 40));
  }

  console.log(`\n=== ${path} ===`);
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
  return { parsedCount: parsed.length, failedCount: failed.length, created, updated };
}

async function main() {
  const path = process.argv[2] ?? "data/cfm-raw";
  const files = resolveTxtFiles(path);

  if (files.length === 0) {
    console.log(`Nenhum arquivo .txt encontrado em ${path}`);
    return;
  }

  let totalParsed = 0;
  let totalFailed = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  for (const file of files) {
    const r = await importFile(file);
    totalParsed += r.parsedCount;
    totalFailed += r.failedCount;
    totalCreated += r.created;
    totalUpdated += r.updated;
  }

  console.log(
    `\n=== Total: ${files.length} arquivo(s) | ${totalParsed} médicos parseados | ${totalFailed} falharam | ${totalCreated} criados | ${totalUpdated} atualizados ===`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  });
