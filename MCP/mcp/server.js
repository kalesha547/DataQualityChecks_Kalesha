// Disable TLS verification for localhost dev (self-signed cert)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Server }               from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { pipeline, env }  from '@xenova/transformers';
import dotenv     from 'dotenv';
import fs         from 'fs';
import path       from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const require  = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const API_BASE     = process.env.API_BASE_URL || 'https://localhost:7129';
const PDF_FOLDER   = process.env.PDF_FOLDER   || '';
const STORE_PATH   = path.join(__dirname, 'vector-store.json');
const MODEL_NAME   = 'Xenova/all-MiniLM-L6-v2';
env.allowRemoteModels = true;

// ── Lazy-loaded embedder (initialised on first PDF tool call) ─────────────────
let embedder = null;
async function getEmbedder() {
  if (!embedder) embedder = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
  return embedder;
}

// ── Vector store (loaded once from disk) ─────────────────────────────────────
let vectorStore = null;
function loadVectorStore() {
  if (vectorStore) return vectorStore;
  if (!fs.existsSync(STORE_PATH)) return null;
  try {
    vectorStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return vectorStore;
  } catch {
    return null;
  }
}

// ── Cosine similarity ─────────────────────────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ── Embed a query string ──────────────────────────────────────────────────────
async function embedQuery(text) {
  const emb    = await getEmbedder();
  const output = await emb(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

// ── Search vector store — returns top K chunks across all (or one) document ──
function vectorSearch(queryEmbedding, topK = 5, filterFile = null) {
  const store = loadVectorStore();
  if (!store) return [];

  const results = [];
  for (const doc of store.documents) {
    if (filterFile && doc.fileName.toLowerCase() !== filterFile.toLowerCase()) continue;
    for (const chunk of doc.chunks) {
      results.push({
        fileName : doc.fileName,
        pages    : doc.pages,
        text     : chunk.text,
        index    : chunk.index,
        score    : cosineSimilarity(queryEmbedding, chunk.embedding),
      });
    }
  }

  // Sort by similarity, take top K, then restore reading order within each file
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .sort((a, b) => a.fileName.localeCompare(b.fileName) || a.index - b.index);
}

// ── Format retrieved chunks as context for the LLM ───────────────────────────
function formatChunks(chunks) {
  if (!chunks.length) return 'No relevant content found.';
  return chunks.map(c =>
    `[Source: ${c.fileName} | Similarity: ${(c.score * 100).toFixed(1)}%]\n${c.text}`
  ).join('\n\n---\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// DB HELPERS  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function esc(v) { return String(v).replace(/'/g, "''"); }

async function executeQuery(sql, pageNumber = 1, pageSize = 200, commandTimeout = 30) {
  const body = JSON.stringify({ query: sql.trim(), pageNumber, pageSize, commandTimeout });
  const res  = await fetch(`${API_BASE}/api/query/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) { const e = await res.text().catch(() => res.statusText); throw new Error(`API ${res.status}: ${e}`); }
  return res.json();
}

function buildWhere(args) {
  const c = [];
  if (args.mobile_number)   c.push(`Customer_MobileNumber = '${esc(args.mobile_number)}'`);
  if (args.grocery_name)    c.push(`GroceryName LIKE '%${esc(args.grocery_name)}%'`);
  if (args.min_amount  != null) c.push(`Amount >= ${parseFloat(args.min_amount)}`);
  if (args.max_amount  != null) c.push(`Amount <= ${parseFloat(args.max_amount)}`);
  if (args.min_quantity != null) c.push(`Quantity >= ${parseInt(args.min_quantity)}`);
  if (args.max_quantity != null) c.push(`Quantity <= ${parseInt(args.max_quantity)}`);
  if (args.min_reward  != null) c.push(`RewardPoints >= ${parseInt(args.min_reward)}`);
  if (args.max_reward  != null) c.push(`RewardPoints <= ${parseInt(args.max_reward)}`);
  return c.length ? `WHERE ${c.join(' AND ')}` : '';
}

function formatRows(rows) {
  if (!rows?.length) return 'No transactions found.';
  const g = (r, ...ks) => { for (const k of ks) if (r[k] !== undefined) return r[k]; return ''; };
  return rows.map(t =>
    `  TransactionID : ${g(t,'TransactionID','transactionID')}\n` +
    `  Mobile        : ${g(t,'Customer_MobileNumber','customer_MobileNumber')}\n` +
    `  Grocery       : ${g(t,'GroceryName','groceryName')}\n` +
    `  Amount        : ${g(t,'Amount','amount')}\n` +
    `  Quantity      : ${g(t,'Quantity','quantity')}\n` +
    `  RewardPoints  : ${g(t,'RewardPoints','rewardPoints')}`
  ).join('\n---\n');
}

function formatStats(rows, groupBy) {
  if (!rows?.length) return 'No data found.';
  const g = (r, ...ks) => { for (const k of ks) if (r[k] !== undefined) return r[k]; return 'N/A'; };
  if (groupBy === 'none') {
    const s = rows[0];
    return `Transaction Summary:\n` +
      `  Total Transactions : ${g(s,'TotalTransactions','totalTransactions')}\n` +
      `  Total Amount       : ${g(s,'TotalAmount','totalAmount')}\n` +
      `  Average Amount     : ${Number(g(s,'AvgAmount','avgAmount')).toFixed(2)}\n` +
      `  Max Amount         : ${g(s,'MaxAmount','maxAmount')}\n` +
      `  Min Amount         : ${g(s,'MinAmount','minAmount')}\n` +
      `  Total Quantity     : ${g(s,'TotalQuantity','totalQuantity')}\n` +
      `  Total RewardPoints : ${g(s,'TotalRewardPoints','totalRewardPoints')}\n` +
      `  Avg RewardPoints   : ${Number(g(s,'AvgRewardPoints','avgRewardPoints')).toFixed(2)}`;
  }
  const col = groupBy === 'Customer_MobileNumber'
    ? ['Customer_MobileNumber','customer_MobileNumber']
    : ['GroceryName','groceryName'];
  return `Stats grouped by ${groupBy} (${rows.length} groups):\n\n` +
    rows.map(s =>
      `  ${groupBy}: ${g(s,...col)}\n` +
      `    Transactions : ${g(s,'TotalTransactions','totalTransactions')}\n` +
      `    Total Amount : ${g(s,'TotalAmount','totalAmount')}\n` +
      `    Avg Amount   : ${Number(g(s,'AvgAmount','avgAmount')).toFixed(2)}\n` +
      `    Total Qty    : ${g(s,'TotalQuantity','totalQuantity')}\n` +
      `    RewardPoints : ${g(s,'TotalRewardPoints','totalRewardPoints')}`
    ).join('\n---\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const TOOLS = [
  // ── Transaction tools ─────────────────────────────────────────────────────
  {
    name: 'search_transactions',
    description: 'Search and filter eCommerce transactions by mobile, grocery, amount, quantity, or reward points.',
    inputSchema: {
      type: 'object',
      properties: {
        mobile_number:  { type: 'string',  description: 'Customer mobile number (exact)' },
        grocery_name:   { type: 'string',  description: 'Grocery name (partial match)' },
        min_amount:     { type: 'number' }, max_amount:  { type: 'number' },
        min_quantity:   { type: 'number' }, max_quantity:{ type: 'number' },
        min_reward:     { type: 'number' }, max_reward:  { type: 'number' },
        order_by:  { type: 'string', enum: ['TransactionID','Amount','Quantity','RewardPoints','GroceryName','Customer_MobileNumber'] },
        order_dir: { type: 'string', enum: ['ASC','DESC'] },
        page:      { type: 'number' },
        page_size: { type: 'number', description: 'Max 1000' },
      },
    },
  },
  {
    name: 'get_transaction_stats',
    description: 'Aggregated stats: totals, averages, counts. group_by="GroceryName" for top items, "Customer_MobileNumber" for top customers, "none" for overall totals.',
    inputSchema: {
      type: 'object',
      properties: {
        group_by:      { type: 'string', enum: ['Customer_MobileNumber','GroceryName','none'] },
        mobile_number: { type: 'string' },
        grocery_name:  { type: 'string' },
      },
    },
  },
  {
    name: 'get_transaction_by_id',
    description: 'Get a single transaction by TransactionID.',
    inputSchema: {
      type: 'object', required: ['transaction_id'],
      properties: { transaction_id: { type: 'number' } },
    },
  },

  // ── PDF / RAG tools ───────────────────────────────────────────────────────
  {
    name: 'list_pdfs',
    description: 'List all PDF documents that have been ingested into the vector store. Call this to discover available documents.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ask_pdf',
    description:
      'Answer a question about a specific PDF using semantic (RAG) search. ' +
      'Finds the most relevant passages by meaning — not just keywords. ' +
      'Use the filename from list_pdfs.',
    inputSchema: {
      type: 'object',
      required: ['filename', 'question'],
      properties: {
        filename: { type: 'string', description: 'PDF filename from list_pdfs, e.g. "report.pdf"' },
        question: { type: 'string', description: 'The question to answer' },
        top_k:    { type: 'number', description: 'Number of passages to retrieve (default 5)' },
      },
    },
  },
  {
    name: 'ask_all_pdfs',
    description:
      'Search ALL ingested PDFs semantically and return the most relevant passages. ' +
      'Use when the user does not specify a file, or wants answers across multiple documents.',
    inputSchema: {
      type: 'object',
      required: ['question'],
      properties: {
        question: { type: 'string', description: 'The question to search across all PDFs' },
        top_k:    { type: 'number', description: 'Total passages to retrieve (default 6)' },
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MCP SERVER
// ─────────────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'transactions-mcp', version: '3.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── search_transactions ────────────────────────────────────────────────
    if (name === 'search_transactions') {
      const allowed  = ['TransactionID','Customer_MobileNumber','GroceryName','Amount','Quantity','RewardPoints'];
      const orderBy  = allowed.includes(args.order_by) ? args.order_by : 'TransactionID';
      const orderDir = args.order_dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const pageSize = Math.min(parseInt(args.page_size) || 50, 1000);
      const page     = parseInt(args.page) || 1;
      const where    = buildWhere(args);
      const sql      =
        `SELECT TransactionID, Customer_MobileNumber, GroceryName, Amount, Quantity, RewardPoints ` +
        `FROM [eCommerce].[dbo].[Transactions] ${where} ORDER BY ${orderBy} ${orderDir}`;
      const result   = await executeQuery(sql, page, pageSize);
      const rows     = result?.data ?? result ?? [];
      return { content: [{ type: 'text', text: `${rows.length} transaction(s):\n\n${formatRows(rows)}` }] };
    }

    // ── get_transaction_stats ──────────────────────────────────────────────
    if (name === 'get_transaction_stats') {
      const groupBy = args.group_by || 'none';
      const where   = buildWhere(args);
      const sql = groupBy !== 'none'
        ? `SELECT ${groupBy}, COUNT(*) AS TotalTransactions, SUM(Amount) AS TotalAmount, ` +
          `AVG(Amount) AS AvgAmount, SUM(Quantity) AS TotalQuantity, SUM(RewardPoints) AS TotalRewardPoints ` +
          `FROM [eCommerce].[dbo].[Transactions] ${where} GROUP BY ${groupBy} ORDER BY TotalAmount DESC`
        : `SELECT COUNT(*) AS TotalTransactions, SUM(Amount) AS TotalAmount, AVG(Amount) AS AvgAmount, ` +
          `MAX(Amount) AS MaxAmount, MIN(Amount) AS MinAmount, SUM(Quantity) AS TotalQuantity, ` +
          `SUM(RewardPoints) AS TotalRewardPoints, AVG(CAST(RewardPoints AS FLOAT)) AS AvgRewardPoints ` +
          `FROM [eCommerce].[dbo].[Transactions] ${where}`;
      const result = await executeQuery(sql, 1, 1000);
      const rows   = result?.data ?? result ?? [];
      return { content: [{ type: 'text', text: formatStats(rows, groupBy) }] };
    }

    // ── get_transaction_by_id ──────────────────────────────────────────────
    if (name === 'get_transaction_by_id') {
      const id = parseInt(args.transaction_id);
      if (isNaN(id)) throw new Error('transaction_id must be a number');
      const sql    = `SELECT TransactionID, Customer_MobileNumber, GroceryName, Amount, Quantity, RewardPoints FROM [eCommerce].[dbo].[Transactions] WHERE TransactionID = ${id}`;
      const result = await executeQuery(sql, 1, 1);
      const rows   = result?.data ?? result ?? [];
      if (!rows.length) return { content: [{ type: 'text', text: `Transaction #${id} not found.` }] };
      return { content: [{ type: 'text', text: formatRows(rows) }] };
    }

    // ── list_pdfs ──────────────────────────────────────────────────────────
    if (name === 'list_pdfs') {
      const store = loadVectorStore();
      if (!store || !store.documents.length) {
        return { content: [{ type: 'text', text:
          'No PDFs ingested yet.\n\nRun:  npm run ingest\n\nThis reads your PDF_FOLDER and builds the vector store.' }] };
      }
      const lines = store.documents.map((d, i) =>
        `  ${i + 1}. ${d.fileName}  (${d.pages} pages, ${d.chunks.length} chunks)`
      ).join('\n');
      return { content: [{ type: 'text', text:
        `${store.documents.length} ingested PDF(s)  [model: ${store.model}]\n\n${lines}` }] };
    }

    // ── ask_pdf ────────────────────────────────────────────────────────────
    if (name === 'ask_pdf') {
      const store = loadVectorStore();
      if (!store) throw new Error('Vector store not found. Run:  npm run ingest');

      const match = store.documents.find(d => d.fileName.toLowerCase() === args.filename.toLowerCase());
      if (!match) {
        const names = store.documents.map(d => d.fileName).join(', ');
        throw new Error(`"${args.filename}" not in vector store. Available: ${names}`);
      }

      const topK   = parseInt(args.top_k) || 5;
      const qEmbed = await embedQuery(args.question);
      const chunks = vectorSearch(qEmbed, topK, args.filename);

      if (!chunks.length) return { content: [{ type: 'text', text: 'No relevant content found.' }] };

      return { content: [{ type: 'text', text:
        `RAG results for: "${args.question}"\nSource: ${args.filename}\n\n${formatChunks(chunks)}` }] };
    }

    // ── ask_all_pdfs ───────────────────────────────────────────────────────
    if (name === 'ask_all_pdfs') {
      const store = loadVectorStore();
      if (!store) throw new Error('Vector store not found. Run:  npm run ingest');

      const topK   = parseInt(args.top_k) || 6;
      const qEmbed = await embedQuery(args.question);
      const chunks = vectorSearch(qEmbed, topK);

      if (!chunks.length) return { content: [{ type: 'text', text: 'No relevant content found across any PDF.' }] };

      const sources = [...new Set(chunks.map(c => c.fileName))];
      return { content: [{ type: 'text', text:
        `RAG results for: "${args.question}"\n` +
        `Sources: ${sources.join(', ')}  (${store.documents.length} PDFs searched)\n\n` +
        formatChunks(chunks) }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };

  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
