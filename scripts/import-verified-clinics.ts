import { createReadStream, writeFileSync } from "fs";
import { streamArray } from "stream-json/streamers/stream-array.js";
import { prisma } from "../src/lib/prisma";

/**
 * console.log through a piped/redirected (non-TTY) stdout is block-buffered
 * by Node, not line-buffered — confirmed live: a run of this script showed
 * zero output beyond the first line for 30+ minutes of real, active work,
 * because nothing forced a flush. Writing progress to a small file directly
 * (fs.writeFileSync, unbuffered) is what actually lets progress be observed
 * from outside the process while it's running a long import like this one.
 */
const PROGRESS_FILE = "data/cnes-raw/.import-progress.json";
function writeProgress(data: Record<string, unknown>) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
  } catch {
    // Progress visibility is a nice-to-have, never worth crashing the import over.
  }
}

/**
 * IBGE's numeric UF codes — a stable national standard (not derived or
 * guessed), since CO_UF in the CNES export is this code, not the two-letter
 * abbreviation used everywhere else in this codebase.
 */
const IBGE_UF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
  "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
  "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS",
  "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

type CnesRecord = {
  CO_CNES: string;
  NU_CNPJ?: string;
  NO_RAZAO_SOCIAL?: string;
  NO_FANTASIA?: string;
  NO_LOGRADOURO?: string;
  NU_ENDERECO?: string;
  NO_BAIRRO?: string;
  CO_CEP?: string;
  NU_TELEFONE?: string;
  NO_EMAIL?: string;
  CO_IBGE?: string;
  CO_UF?: string;
  CO_MOTIVO_DESAB?: string;
};

type Parsed = {
  cnesCode: string;
  cnpj: string | null;
  legalName: string | null;
  tradeName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  ibgeCityCode: string | null;
  uf: string | null;
  operationalStatus: string;
};

const orNull = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function parseRecord(r: CnesRecord): Parsed | null {
  if (!r.CO_CNES) return null;
  const address = [orNull(r.NO_LOGRADOURO), orNull(r.NU_ENDERECO), orNull(r.NO_BAIRRO), orNull(r.CO_CEP)].filter(Boolean).join(", ") || null;
  return {
    cnesCode: r.CO_CNES,
    cnpj: orNull(r.NU_CNPJ),
    legalName: orNull(r.NO_RAZAO_SOCIAL),
    tradeName: orNull(r.NO_FANTASIA),
    address,
    phone: orNull(r.NU_TELEFONE),
    email: orNull(r.NO_EMAIL),
    ibgeCityCode: orNull(r.CO_IBGE),
    uf: r.CO_UF ? (IBGE_UF[r.CO_UF] ?? null) : null,
    operationalStatus: orNull(r.CO_MOTIVO_DESAB) ? "DESABILITADO" : "ATIVO",
  };
}

const SOURCE_URL = "https://dadosabertos.saude.gov.br/dataset/cnes-cadastro-nacional-de-estabelecimentos-de-saude";
// Bigger than the doctor-import script's 2000 — confirmed live that a
// single round-trip against this pooled connection can cost 2.5s+ under
// load, so fewer/bigger batches matters more here than for that smaller
// dataset.
const CHUNK_SIZE = 5000;
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Same reasoning as import-verified-doctors.ts: the pooled connection has been observed to intermittently refuse the first connection of a burst even when the server is healthy seconds later. */
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
 * The full national export is ~640MB of JSON — past V8's ~536MB max string
 * length (ERR_STRING_TOO_LONG on a plain readFileSync), confirmed live. A
 * hand-rolled brace-depth char scanner was tried first and turned out to be
 * pathologically slow in practice (confirmed live: 600+ CPU-seconds to get
 * through under 10% of the file — a real bug in that approach, never fully
 * root-caused, likely repeated flattening of an already-sliced buffer
 * string on every record). Replaced with stream-json's StreamArray, a
 * proper SAX-style incremental parser built for exactly this — one JSON
 * array too big to hold in memory at once.
 */
async function* streamCnesRecords(path: string): AsyncGenerator<CnesRecord> {
  const pipeline = streamArray.withParserAsStream();
  createReadStream(path).pipe(pipeline);
  for await (const { value } of pipeline as AsyncIterable<{ key: number; value: CnesRecord }>) {
    yield value;
  }
}

async function runImport(path: string): Promise<void> {
  console.log(`Lendo ${path} (streaming)...`);
  const byKey = new Map<string, Parsed>();
  let total = 0;
  for await (const r of streamCnesRecords(path)) {
    total++;
    const p = parseRecord(r);
    if (p) byKey.set(p.cnesCode, p);
    if (total % 50000 === 0) {
      console.log(`  lidos ${total} registros...`);
      writeProgress({ phase: "parsing", recordsRead: total });
    }
  }
  console.log(`${total} registros no arquivo.`);
  const unique = [...byKey.values()];
  console.log(`Únicos (CNES): ${unique.length}`);

  console.log("Carregando cadastro atual do banco para comparar...");
  const existing = await withRetry(() =>
    prisma.verifiedClinic.findMany({
      select: { cnesCode: true, cnpj: true, legalName: true, tradeName: true, address: true, phone: true, email: true, operationalStatus: true },
    }),
  );
  const existingMap = new Map(existing.map((c) => [c.cnesCode, c]));

  const toCreate: Parsed[] = [];
  const toUpdate: Parsed[] = [];
  for (const p of unique) {
    const prev = existingMap.get(p.cnesCode);
    if (!prev) {
      toCreate.push(p);
    } else if (
      prev.cnpj !== p.cnpj ||
      prev.legalName !== p.legalName ||
      prev.tradeName !== p.tradeName ||
      prev.address !== p.address ||
      prev.phone !== p.phone ||
      prev.email !== p.email ||
      prev.operationalStatus !== p.operationalStatus
    ) {
      toUpdate.push(p);
    }
  }
  console.log(`Novos: ${toCreate.length} | Atualizações: ${toUpdate.length} | Sem mudança: ${unique.length - toCreate.length - toUpdate.length}`);
  writeProgress({ phase: "diffed", toCreate: toCreate.length, toUpdate: toUpdate.length });

  let created = 0;
  const createBatches = chunk(toCreate, CHUNK_SIZE);
  const batchStart = Date.now();
  for (let i = 0; i < createBatches.length; i++) {
    const batch = createBatches[i];
    const result = await withRetry(() =>
      prisma.verifiedClinic.createMany({
        data: batch.map((p) => ({ ...p, sourceUrl: SOURCE_URL })),
        skipDuplicates: true,
      }),
    );
    created += result.count;
    const elapsedS = ((Date.now() - batchStart) / 1000).toFixed(1);
    console.log(`  criando... lote ${i + 1}/${createBatches.length} (${created} criados, ${elapsedS}s decorridos)`);
    writeProgress({ phase: "creating", batch: i + 1, totalBatches: createBatches.length, created, elapsedSeconds: Number(elapsedS) });
  }

  let updated = 0;
  for (const batch of chunk(toUpdate, 200)) {
    await withRetry(() =>
      Promise.all(
        batch.map((p) =>
          prisma.verifiedClinic.update({
            where: { cnesCode: p.cnesCode },
            data: { cnpj: p.cnpj, legalName: p.legalName, tradeName: p.tradeName, address: p.address, phone: p.phone, email: p.email, ibgeCityCode: p.ibgeCityCode, uf: p.uf, operationalStatus: p.operationalStatus },
          }),
        ),
      ),
    );
    updated += batch.length;
  }

  console.log(`=== Concluído: ${created} criados | ${updated} atualizados | ${unique.length - created - updated} sem mudança ===`);
}

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Uso: tsx scripts/import-verified-clinics.ts <caminho-do-json>");
    console.error(`Baixe o arquivo em: ${SOURCE_URL} (recurso "CNES Estabelecimentos", formato JSON, ~640MB descompactado)`);
    process.exit(1);
  }
  await runImport(path);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  });
