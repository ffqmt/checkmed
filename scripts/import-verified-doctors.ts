import { readFileSync, readdirSync, statSync, watch } from "fs";
import { join } from "path";
import { prisma } from "../src/lib/prisma";

type Parsed = { name: string; crm: string; uf: string; situacao: string | null; especialidade: string | null };

const CRM_LINE = /^CRM:\s*([\w-]+)\s*\/\s*([A-Z]{2})$/;

/**
 * Neither a blank line nor a dash line reliably separates one doctor's
 * record from the next in these files: a blank line can appear *inside* a
 * single record (e.g. after a wrapped "Especialidades" line, before
 * "Endereço:"), and the browser-console pagination script's ".busca-
 * resultado" selector turned out to capture a whole PAGE (~10 doctors
 * concatenated with no separator at all) rather than one row — so a dash
 * only marks a page boundary, not a doctor boundary.
 *
 * The one line that's unambiguous is "CRM: 1234/UF", which always
 * immediately follows the doctor's name with no blank line in between. So
 * instead of splitting into blocks first, scan for every CRM line directly
 * and treat the line right before it as the start of that record — this
 * recovers every doctor regardless of which separator style (or none) the
 * source file uses.
 */
function parseAllDoctors(raw: string): { parsed: Parsed[]; failed: number } {
  const lines = raw.split("\n").map((l) => l.trim());
  const crmLineIdx: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (CRM_LINE.test(lines[i])) crmLineIdx.push(i);
  }

  const parsed: Parsed[] = [];
  let failed = 0;
  for (let k = 0; k < crmLineIdx.length; k++) {
    const crmIdx = crmLineIdx[k];
    const nameIdx = crmIdx - 1;
    const name = lines[nameIdx];
    const crmMatch = lines[crmIdx].match(CRM_LINE);
    if (!name || !crmMatch) {
      failed++;
      continue;
    }
    const [, crm, uf] = crmMatch;

    const blockEnd = k + 1 < crmLineIdx.length ? crmLineIdx[k + 1] - 1 : lines.length;
    const block = lines.slice(nameIdx, blockEnd);

    const situacaoLine = block.find((l) => l.startsWith("Situação:"));
    const situacao = situacaoLine ? situacaoLine.replace("Situação:", "").trim() || null : null;

    const specStart = block.findIndex((l) => l.startsWith("Especialidades/Áreas de Atuação:"));
    const addrStart = block.findIndex((l) => l.startsWith("Endereço:"));
    let especialidade: string | null = null;
    if (specStart !== -1) {
      const specEnd = addrStart !== -1 && addrStart > specStart ? addrStart : block.length;
      const specLines = block.slice(specStart + 1, specEnd).filter(Boolean);
      const joined = specLines.join("; ");
      especialidade = /sem especialidade registrada/i.test(joined) || !joined ? null : joined;
    }

    parsed.push({ name, crm, uf, situacao, especialidade });
  }

  return { parsed, failed };
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

function parseFile(path: string): { parsed: Parsed[]; failed: number } {
  const raw = readFileSync(path, "utf-8");
  const { parsed, failed } = parseAllDoctors(raw);
  console.log(`${path}: ${parsed.length} médicos reconhecidos${failed ? ` | ${failed} linhas de CRM não puderam ser lidas` : ""}`);
  return { parsed, failed };
}

const CHUNK_SIZE = 2000;
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function runImport(path: string): Promise<void> {
  const files = resolveTxtFiles(path);
  if (files.length === 0) {
    console.log(`Nenhum arquivo .txt encontrado em ${path}`);
    return;
  }

  const allParsed: Parsed[] = [];
  let totalFailed = 0;
  for (const file of files) {
    const { parsed, failed } = parseFile(file);
    allParsed.push(...parsed);
    totalFailed += failed;
  }

  // Last occurrence wins for duplicate crm+uf pairs across files/pages.
  const byKey = new Map<string, Parsed>();
  for (const p of allParsed) byKey.set(`${p.crm}_${p.uf}`, p);
  const unique = [...byKey.values()];

  console.log(`Total reconhecido: ${allParsed.length} | únicos (crm+uf): ${unique.length} | linhas ilegíveis: ${totalFailed}`);

  const existing = await prisma.verifiedDoctor.findMany({
    select: { crm: true, uf: true, officialName: true, registrationStatus: true, specialty: true },
  });
  const existingMap = new Map(existing.map((d) => [`${d.crm}_${d.uf}`, d]));

  const toCreate: Parsed[] = [];
  const toUpdate: Parsed[] = [];
  for (const p of unique) {
    const prev = existingMap.get(`${p.crm}_${p.uf}`);
    if (!prev) {
      toCreate.push(p);
    } else if (prev.officialName !== p.name || prev.registrationStatus !== p.situacao || prev.specialty !== p.especialidade) {
      toUpdate.push(p);
    }
  }

  console.log(`Novos: ${toCreate.length} | Atualizações: ${toUpdate.length} | Sem mudança: ${unique.length - toCreate.length - toUpdate.length}`);

  let created = 0;
  for (const batch of chunk(toCreate, CHUNK_SIZE)) {
    const result = await prisma.verifiedDoctor.createMany({
      data: batch.map((p) => ({
        crm: p.crm,
        uf: p.uf,
        officialName: p.name,
        registrationStatus: p.situacao,
        specialty: p.especialidade,
        sourceUrl: "https://portal.cfm.org.br/busca-medicos",
        notes: "Importado de consulta manual (dados copiados diretamente do portal do CFM).",
      })),
      skipDuplicates: true,
    });
    created += result.count;
  }

  let updated = 0;
  for (const p of toUpdate) {
    await prisma.verifiedDoctor.update({
      where: { crm_uf: { crm: p.crm, uf: p.uf } },
      data: { officialName: p.name, registrationStatus: p.situacao, specialty: p.especialidade },
    });
    updated++;
  }

  console.log(`=== Concluído: ${created} criados | ${updated} atualizados | ${unique.length - created - updated} sem mudança ===`);
}

/**
 * The Supabase pooled connection has been observed to intermittently refuse
 * the first connection of a burst (P1001, "Can't reach database server")
 * even when the server is fine seconds later — retry a few times with
 * backoff instead of letting one blip kill the whole long-running watcher.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 4, delayMs = 3000): Promise<T> {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === attempts) throw e;
      const reason = (e as Error).message.split("\n").find((l) => l.trim()) ?? String(e);
      console.error(`Tentativa ${i}/${attempts} falhou (${reason.trim()}), tentando de novo em ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

/**
 * Watches the folder and re-imports automatically whenever a .txt is added
 * or changed — no need to remember to run the command by hand after every
 * file the browser-console collector drops in. Debounced by 4s of silence
 * per file before importing, since a browser writes a large download
 * incrementally and fs.watch fires on every chunk, not just on completion.
 */
async function watchAndImport(path: string): Promise<void> {
  console.log(`Observando ${path} — qualquer .txt novo ou modificado é importado sozinho. Ctrl+C para parar.\n`);
  await withRetry(() => runImport(path));

  const pendingTimers = new Map<string, NodeJS.Timeout>();
  let importRunning = false;
  let importQueued = false;

  const runQueuedImport = async () => {
    if (importRunning) {
      importQueued = true;
      return;
    }
    importRunning = true;
    try {
      console.log(`\n[${new Date().toLocaleTimeString("pt-BR")}] Arquivo novo/alterado detectado — importando...`);
      await withRetry(() => runImport(path));
    } catch (e) {
      console.error("Falha ao importar:", e);
    } finally {
      importRunning = false;
      if (importQueued) {
        importQueued = false;
        await runQueuedImport();
      }
    }
  };

  watch(path, { persistent: true }, (_eventType, filename) => {
    if (!filename || !filename.toLowerCase().endsWith(".txt")) return;
    const existingTimer = pendingTimers.get(filename);
    if (existingTimer) clearTimeout(existingTimer);
    pendingTimers.set(
      filename,
      setTimeout(() => {
        pendingTimers.delete(filename);
        void runQueuedImport();
      }, 4000),
    );
  });

  // Keep the process alive indefinitely.
  await new Promise(() => {});
}

async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch");
  const path = args.find((a) => !a.startsWith("--")) ?? "data/cfm-raw";

  if (watchMode) {
    await watchAndImport(path);
  } else {
    await runImport(path);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  });
