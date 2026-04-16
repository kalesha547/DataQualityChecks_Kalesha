'use strict';

const vscode  = require('vscode');
const https   = require('https');
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const pdfParse = require('pdf-parse');

// ── DB Schema (used when generating SQL) ─────────────────────────────────────
const TABLE_SCHEMA = `
Database: eCommerce
Table: [eCommerce].[dbo].[Transactions]
Columns:
  TransactionID          INT            Primary key
  Customer_MobileNumber  NVARCHAR       Customer's phone number
  GroceryName            NVARCHAR       Name of the grocery item
  Amount                 DECIMAL(18,2)  Transaction amount
  Quantity               INT            Items purchased
  RewardPoints           INT            Loyalty reward points earned
`;

// ── Predefined transaction queries ───────────────────────────────────────────
const COMMAND_QUERIES = {
  summary: `
    SELECT COUNT(*) AS TotalTransactions, SUM(Amount) AS TotalRevenue,
      CAST(AVG(Amount) AS DECIMAL(18,2)) AS AvgOrderValue,
      MAX(Amount) AS MaxTransaction, MIN(Amount) AS MinTransaction,
      SUM(Quantity) AS TotalItemsSold, SUM(RewardPoints) AS TotalRewardPoints
    FROM [eCommerce].[dbo].[Transactions]`,
  'top-customers': `
    SELECT TOP 10 Customer_MobileNumber,
      COUNT(*) AS TotalOrders, SUM(Amount) AS TotalSpent,
      SUM(RewardPoints) AS TotalRewardPoints
    FROM [eCommerce].[dbo].[Transactions]
    GROUP BY Customer_MobileNumber ORDER BY TotalSpent DESC`,
  'top-groceries': `
    SELECT TOP 10 GroceryName,
      COUNT(*) AS TotalOrders, SUM(Amount) AS TotalRevenue,
      SUM(Quantity) AS TotalQtySold
    FROM [eCommerce].[dbo].[Transactions]
    GROUP BY GroceryName ORDER BY TotalRevenue DESC`,
};

// ── Web API call ──────────────────────────────────────────────────────────────
function callWebApi(apiUrl, sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql.trim(), pageNumber: 1, pageSize: 200, commandTimeout: 30 });
    let parsed;
    try { parsed = new URL(apiUrl); } catch { return reject(new Error(`Invalid API URL: ${apiUrl}`)); }
    const isHttps = parsed.protocol === 'https:';
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: '/api/query/execute',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      rejectUnauthorized: false,
    };
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Non-JSON response (${res.statusCode}): ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', e => reject(new Error(`Cannot reach API at ${apiUrl}: ${e.message}`)));
    req.write(body);
    req.end();
  });
}

// ── Format rows as Markdown table ────────────────────────────────────────────
function toMarkdownTable(rows) {
  if (!rows || rows.length === 0) return '_No results found._';
  const keys = Object.keys(rows[0]);
  return [
    `| ${keys.join(' | ')} |`,
    `| ${keys.map(() => '---').join(' | ')} |`,
    ...rows.map(r => `| ${keys.map(k => String(r[k] ?? '')).join(' | ')} |`),
  ].join('\n');
}

// ── Get Copilot LLM model ─────────────────────────────────────────────────────
async function getModel() {
  let models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
  if (!models.length) models = await vscode.lm.selectChatModels({ vendor: 'copilot' });
  if (!models.length) throw new Error('No Copilot model available. Make sure GitHub Copilot Chat is installed and signed in.');
  return models[0];
}

// ── Generate SQL from natural language ───────────────────────────────────────
async function generateSQL(userPrompt, model, token) {
  const messages = [
    vscode.LanguageModelChatMessage.User(
      `You are a SQL Server expert. Generate a valid T-SQL SELECT query.\n\n` +
      `Schema:\n${TABLE_SCHEMA}\n\n` +
      `Rules:\n` +
      `- ONLY SELECT queries. Never INSERT, UPDATE, DELETE, DROP, etc.\n` +
      `- ONLY query [eCommerce].[dbo].[Transactions]\n` +
      `- Default TOP 100 unless user specifies otherwise\n` +
      `- Return ONLY the raw SQL, no markdown, no explanation\n\n` +
      `Request: ${userPrompt}`
    ),
  ];
  let sql = '';
  const res = await model.sendRequest(messages, {}, token);
  for await (const chunk of res.text) sql += chunk;
  return sql.replace(/```sql|```/gi, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Split text into overlapping chunks (for large PDFs)
function chunkText(text, size = 4000, overlap = 300) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

// Score chunks by keyword overlap with the question
function findRelevantChunks(chunks, question, maxChunks = 6) {
  const stopwords = new Set(['what','when','where','which','with','from','have','this','that','they',
    'will','about','more','also','been','were','then','than','into','your','their','does','show','tell',
    'give','find','list','many','much','some','here','there','these','those','would','could','should']);
  const keywords = question.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));

  if (keywords.length === 0) return chunks.slice(0, maxChunks);

  return chunks
    .map((chunk, index) => {
      const lower = chunk.toLowerCase();
      const score = keywords.reduce((acc, kw) => acc + (lower.split(kw).length - 1), 0);
      return { chunk, score, index };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .sort((a, b) => a.index - b.index)   // restore reading order
    .map(s => s.chunk);
}

// Parse "/ask-pdf C:\path\file.pdf the user's question"
function parsePDFPrompt(prompt) {
  const trimmed = prompt.trim();
  // Support quoted paths: "C:\my docs\file.pdf" question
  const quoted = trimmed.match(/^["'](.+?\.pdf)["']\s*(.*)/is);
  if (quoted) return { filePath: quoted[1], question: quoted[2].trim() };
  // Unquoted: first token ending in .pdf
  const unquoted = trimmed.match(/^(\S+\.pdf)\s*(.*)/is);
  if (unquoted) return { filePath: unquoted[1], question: unquoted[2].trim() };
  return null;
}

// Extract text from a PDF file
async function extractPDFText(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  const buffer = fs.readFileSync(resolved);
  const data = await pdfParse(buffer);
  return { text: data.text, pages: data.numpages, fileName: path.basename(resolved) };
}

// Ask LLM a question about PDF content
async function answerFromPDF(pdfText, fileName, pages, question, model, stream, token) {
  const MAX_DIRECT = 60000; // ~60k chars → send directly; larger → chunk first

  let context;
  let note = '';

  if (pdfText.length <= MAX_DIRECT) {
    context = pdfText;
  } else {
    const chunks = chunkText(pdfText);
    const relevant = findRelevantChunks(chunks, question);
    context = relevant.join('\n\n— — —\n\n');
    note = `\n> _(Large PDF — ${pages} pages. Showing the ${relevant.length} most relevant sections.)_\n`;
  }

  stream.markdown(`**File:** \`${fileName}\` (${pages} page${pages === 1 ? '' : 's'})${note}\n\n`);
  stream.markdown(`**Question:** ${question}\n\n**Answer:**\n\n`);

  const messages = [
    vscode.LanguageModelChatMessage.User(
      `You are a helpful assistant. Answer the user's question using ONLY the document content below.\n` +
      `If the answer is not in the document, say "I couldn't find that in the document."\n\n` +
      `Document: ${fileName}\n\n` +
      `Content:\n${context}\n\n` +
      `Question: ${question}`
    ),
  ];

  const res = await model.sendRequest(messages, {}, token);
  for await (const chunk of res.text) {
    stream.markdown(chunk);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CHAT HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async function handleChatRequest(request, _context, stream, token) {
  const config = vscode.workspace.getConfiguration('paafData');
  const apiUrl = config.get('apiUrl') || 'https://localhost:7129';

  // ── /ask-pdf ────────────────────────────────────────────────────────────────
  if (request.command === 'ask-pdf') {
    const parsed = parsePDFPrompt(request.prompt?.trim() ?? '');

    if (!parsed) {
      stream.markdown(
        `### How to use /ask-pdf\n\n` +
        `Provide the PDF file path followed by your question:\n\n` +
        `\`\`\`\n@paafData /ask-pdf C:\\docs\\report.pdf What are the key findings?\n\`\`\`\n\n` +
        `**Examples:**\n` +
        `- \`@paafData /ask-pdf C:\\invoices\\Q1.pdf What is the total amount?\`\n` +
        `- \`@paafData /ask-pdf C:\\reports\\policy.pdf Summarize the main points\`\n` +
        `- \`@paafData /ask-pdf C:\\data\\contract.pdf What are the payment terms?\``
      );
      return;
    }

    if (!parsed.question) {
      stream.markdown(`Please add a question after the file path.\n\nExample: \`@paafData /ask-pdf ${parsed.filePath} Summarize this document\``);
      return;
    }

    stream.progress('Reading PDF...');
    let pdf;
    try {
      pdf = await extractPDFText(parsed.filePath);
    } catch (err) {
      stream.markdown(`❌ ${err.message}`);
      return;
    }

    if (!pdf.text || pdf.text.trim().length < 10) {
      stream.markdown(`❌ Could not extract text from \`${parsed.filePath}\`. The PDF may be image-based (scanned). Only text-based PDFs are supported.`);
      return;
    }

    stream.progress('Analysing with Copilot...');
    let model;
    try { model = await getModel(); }
    catch (err) { stream.markdown(`❌ ${err.message}`); return; }

    try {
      await answerFromPDF(pdf.text, pdf.fileName, pdf.pages, parsed.question, model, stream, token);
    } catch (err) {
      stream.markdown(`❌ LLM error: ${err.message}`);
    }
    return;
  }

  // ── Pre-built transaction commands ──────────────────────────────────────────
  if (request.command && COMMAND_QUERIES[request.command]) {
    stream.progress('Querying database...');
    let result;
    try { result = await callWebApi(apiUrl, COMMAND_QUERIES[request.command]); }
    catch (err) { stream.markdown(`❌ API error: ${err.message}`); return; }
    const rows = Array.isArray(result) ? result : (result?.data ?? []);
    stream.markdown(`**/${request.command}**\n\n${toMarkdownTable(rows)}`);
    return;
  }

  // ── Natural language transaction query ──────────────────────────────────────
  const prompt = request.prompt?.trim();
  if (!prompt) {
    stream.markdown(
      `### paafData — What can I help with?\n\n` +
      `**Transactions database:**\n` +
      `- \`@paafData top 5 customers by spending\`\n` +
      `- \`@paafData transactions over ₹500 last month\`\n` +
      `- \`@paafData /summary\`  /  \`/top-customers\`  /  \`/top-groceries\`\n\n` +
      `**PDF documents:**\n` +
      `- \`@paafData /ask-pdf C:\\path\\to\\file.pdf What are the key points?\`\n` +
      `- \`@paafData /ask-pdf C:\\reports\\invoice.pdf What is the total?\``
    );
    return;
  }

  stream.progress('Generating SQL...');
  let model;
  try { model = await getModel(); }
  catch (err) { stream.markdown(`❌ ${err.message}`); return; }

  let sql;
  try { sql = await generateSQL(prompt, model, token); }
  catch (err) { stream.markdown(`❌ ${err.message}`); return; }

  if (!/^\s*SELECT\b/i.test(sql)) {
    stream.markdown(`❌ Only SELECT queries are allowed.\n\nGenerated: \`${sql.slice(0, 100)}\``);
    return;
  }

  stream.markdown(`**SQL:**\n\`\`\`sql\n${sql}\n\`\`\`\n`);
  stream.progress('Querying database...');

  let result;
  try { result = await callWebApi(apiUrl, sql); }
  catch (err) { stream.markdown(`❌ API error: ${err.message}\n\nMake sure your Web API is running at \`${apiUrl}\``); return; }

  const rows = Array.isArray(result) ? result : (result?.data ?? []);
  if (rows.length === 0) { stream.markdown('_No results found._'); return; }
  stream.markdown(`**Results — ${rows.length} row${rows.length === 1 ? '' : 's'}**\n\n${toMarkdownTable(rows)}`);
}

// ── Extension lifecycle ───────────────────────────────────────────────────────
function activate(context) {
  const participant = vscode.chat.createChatParticipant('paaf.data', handleChatRequest);
  participant.followupProvider = {
    provideFollowups(_result, _context, _token) {
      return [
        { prompt: '/summary',       label: '📊 Summary' },
        { prompt: '/top-customers', label: '👤 Top Customers' },
        { prompt: '/top-groceries', label: '🛒 Top Groceries' },
      ];
    },
  };
  context.subscriptions.push(participant);
}

function deactivate() {}

module.exports = { activate, deactivate };
