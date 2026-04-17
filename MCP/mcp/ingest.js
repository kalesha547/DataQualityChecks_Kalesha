/**
 * PDF Ingestion Script — run this once (or whenever PDFs change)
 *
 * Usage:
 *   npm run ingest
 *
 * What it does:
 *   1. Reads all PDFs from PDF_FOLDER (.env)
 *   2. Extracts text with pdf-parse
 *   3. Splits text into overlapping chunks
 *   4. Generates a semantic embedding vector for each chunk
 *      (uses Xenova/all-MiniLM-L6-v2 — downloads ~23 MB on first run, then cached)
 *   5. Saves everything to mcp/vector-store.json
 *
 * Re-run whenever you add / remove / update PDFs.
 */

import dotenv    from 'dotenv';
import fs        from 'fs';
import path      from 'path';
import { pipeline, env } from '@xenova/transformers';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const require    = createRequire(import.meta.url);
const pdfParse   = require('pdf-parse');

const PDF_FOLDER  = process.env.PDF_FOLDER || '';
const STORE_PATH  = path.join(__dirname, 'vector-store.json');
const MODEL_NAME  = 'Xenova/all-MiniLM-L6-v2';
const CHUNK_SIZE  = 512;   // characters per chunk
const OVERLAP     = 100;   // overlap between chunks

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunkText(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const chunks  = [];
  let i = 0;
  while (i < cleaned.length) {
    const end   = Math.min(i + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(i, end).trim();
    if (chunk.length > 40) chunks.push(chunk);   // skip near-empty chunks
    if (end === cleaned.length) break;
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

function progress(current, total, label) {
  const pct  = Math.round((current / total) * 100);
  const bar  = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  process.stdout.write(`\r  [${bar}] ${pct}%  ${label}     `);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validate PDF_FOLDER
  if (!PDF_FOLDER) {
    console.error('\n❌  PDF_FOLDER is not set in .env\n');
    process.exit(1);
  }
  if (!fs.existsSync(PDF_FOLDER)) {
    console.error(`\n❌  PDF_FOLDER not found: ${PDF_FOLDER}\n`);
    process.exit(1);
  }

  const files = fs.readdirSync(PDF_FOLDER).filter(f => f.toLowerCase().endsWith('.pdf'));
  if (!files.length) {
    console.log(`\nNo PDF files found in: ${PDF_FOLDER}\n`);
    process.exit(0);
  }

  console.log(`\n📂  PDF folder : ${PDF_FOLDER}`);
  console.log(`📄  Found      : ${files.length} PDF file(s)\n`);

  // Load embedding model (downloads ~23 MB on first run, cached after)
  console.log(`🤖  Loading embedding model: ${MODEL_NAME}`);
  console.log(`    (First run downloads ~23 MB — cached locally after)\n`);

  env.allowRemoteModels = true;
  const embedder = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
  console.log('    Model ready.\n');

  // Load existing store so we can skip unchanged files
  let existing = { documents: [] };
  if (fs.existsSync(STORE_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch {}
  }
  const existingMap = new Map(existing.documents.map(d => [d.fileName, d]));

  const store = {
    model      : MODEL_NAME,
    chunkSize  : CHUNK_SIZE,
    overlap    : OVERLAP,
    createdAt  : new Date().toISOString(),
    documents  : [],
  };

  let totalChunks = 0;
  let skipped     = 0;

  for (const file of files) {
    const filePath = path.join(PDF_FOLDER, file);
    const stat     = fs.statSync(filePath);
    const mtime    = stat.mtimeMs;

    // Skip if file unchanged since last ingest
    const cached = existingMap.get(file);
    if (cached && cached.mtime === mtime) {
      console.log(`⏭   Skipped (unchanged): ${file}`);
      store.documents.push(cached);
      totalChunks += cached.chunks.length;
      skipped++;
      continue;
    }

    console.log(`📝  Processing: ${file}`);

    let data;
    try {
      const buffer = fs.readFileSync(filePath);
      data = await pdfParse(buffer);
    } catch (err) {
      console.log(`    ⚠  Could not parse: ${err.message}`);
      continue;
    }

    if (!data.text || data.text.trim().length < 20) {
      console.log(`    ⚠  No text layer (scanned/image PDF — skipped)`);
      continue;
    }

    const chunks = chunkText(data.text);
    console.log(`    Pages: ${data.numpages}  →  Chunks: ${chunks.length}`);

    const doc = {
      fileName : file,
      filePath,
      pages    : data.numpages,
      mtime,
      chunks   : [],
    };

    for (let i = 0; i < chunks.length; i++) {
      progress(i + 1, chunks.length, `chunk ${i + 1}/${chunks.length}`);
      const output = await embedder(chunks[i], { pooling: 'mean', normalize: true });
      doc.chunks.push({
        index     : i,
        text      : chunks[i],
        embedding : Array.from(output.data),
      });
    }

    console.log(`\n    ✅  ${chunks.length} chunks embedded\n`);
    store.documents.push(doc);
    totalChunks += chunks.length;
  }

  // Save vector store
  fs.writeFileSync(STORE_PATH, JSON.stringify(store));

  const sizeKB = Math.round(fs.statSync(STORE_PATH).size / 1024);
  console.log(`\n✅  Vector store saved: ${STORE_PATH}`);
  console.log(`    Documents : ${store.documents.length}`);
  console.log(`    Chunks    : ${totalChunks}`);
  console.log(`    Size      : ${sizeKB} KB`);
  if (skipped) console.log(`    Skipped   : ${skipped} unchanged file(s)`);
  console.log(`\nRun "npm start" to start the MCP server.\n`);
}

main().catch(err => { console.error('\n❌ ', err.message); process.exit(1); });
