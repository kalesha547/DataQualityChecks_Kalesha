// Disable TLS verification for localhost dev (self-signed cert)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const API_BASE = process.env.API_BASE_URL || 'https://localhost:7129';
const EXECUTE_ENDPOINT = `${API_BASE}/api/query/execute`;

// Escape single quotes to prevent SQL injection in string parameters
function esc(value) {
  return String(value).replace(/'/g, "''");
}

// POST a SQL query to the Web API
async function executeQuery(sql, pageNumber = 1, pageSize = 100, commandTimeout = 30) {
  const response = await fetch(EXECUTE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, pageNumber, pageSize, commandTimeout }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${err}`);
  }

  return response.json();
}

// Build WHERE clause from filter args
function buildWhere(args) {
  const conditions = [];

  if (args.mobile_number) {
    conditions.push(`Customer_MobileNumber = '${esc(args.mobile_number)}'`);
  }
  if (args.grocery_name) {
    conditions.push(`GroceryName LIKE '%${esc(args.grocery_name)}%'`);
  }
  if (args.min_amount !== undefined && args.min_amount !== null) {
    conditions.push(`Amount >= ${parseFloat(args.min_amount)}`);
  }
  if (args.max_amount !== undefined && args.max_amount !== null) {
    conditions.push(`Amount <= ${parseFloat(args.max_amount)}`);
  }
  if (args.min_quantity !== undefined && args.min_quantity !== null) {
    conditions.push(`Quantity >= ${parseInt(args.min_quantity)}`);
  }
  if (args.max_quantity !== undefined && args.max_quantity !== null) {
    conditions.push(`Quantity <= ${parseInt(args.max_quantity)}`);
  }
  if (args.min_reward !== undefined && args.min_reward !== null) {
    conditions.push(`RewardPoints >= ${parseInt(args.min_reward)}`);
  }
  if (args.max_reward !== undefined && args.max_reward !== null) {
    conditions.push(`RewardPoints <= ${parseInt(args.max_reward)}`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Format a list of transaction rows as readable text
function formatRows(rows) {
  if (!rows || rows.length === 0) return 'No transactions found.';
  return rows.map(t =>
    `  TransactionID : ${t.TransactionID ?? t.transactionID}\n` +
    `  Mobile        : ${t.Customer_MobileNumber ?? t.customer_MobileNumber}\n` +
    `  Grocery       : ${t.GroceryName ?? t.groceryName}\n` +
    `  Amount        : ${t.Amount ?? t.amount}\n` +
    `  Quantity      : ${t.Quantity ?? t.quantity}\n` +
    `  RewardPoints  : ${t.RewardPoints ?? t.rewardPoints}`
  ).join('\n---\n');
}

// Format stats rows as readable text
function formatStats(rows, groupBy) {
  if (!rows || rows.length === 0) return 'No data found.';

  if (groupBy === 'none') {
    const s = rows[0];
    // Normalise key casing from the API response
    const get = (...keys) => { for (const k of keys) if (s[k] !== undefined) return s[k]; return 'N/A'; };
    return (
      `Transaction Summary:\n` +
      `  Total Transactions : ${get('TotalTransactions', 'totalTransactions')}\n` +
      `  Total Amount       : ${get('TotalAmount', 'totalAmount')}\n` +
      `  Average Amount     : ${Number(get('AvgAmount', 'avgAmount')).toFixed(2)}\n` +
      `  Max Amount         : ${get('MaxAmount', 'maxAmount')}\n` +
      `  Min Amount         : ${get('MinAmount', 'minAmount')}\n` +
      `  Total Quantity     : ${get('TotalQuantity', 'totalQuantity')}\n` +
      `  Total RewardPoints : ${get('TotalRewardPoints', 'totalRewardPoints')}\n` +
      `  Avg RewardPoints   : ${Number(get('AvgRewardPoints', 'avgRewardPoints')).toFixed(2)}`
    );
  }

  const col = groupBy === 'Customer_MobileNumber' ? ['Customer_MobileNumber', 'customer_MobileNumber'] : ['GroceryName', 'groceryName'];
  const get = (row, ...keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return 'N/A'; };

  return `Stats grouped by ${groupBy} (${rows.length} groups):\n\n` +
    rows.map(s =>
      `  ${groupBy}: ${get(s, ...col)}\n` +
      `    Transactions : ${get(s, 'TotalTransactions', 'totalTransactions')}\n` +
      `    Total Amount : ${get(s, 'TotalAmount', 'totalAmount')}\n` +
      `    Avg Amount   : ${Number(get(s, 'AvgAmount', 'avgAmount')).toFixed(2)}\n` +
      `    Total Qty    : ${get(s, 'TotalQuantity', 'totalQuantity')}\n` +
      `    RewardPoints : ${get(s, 'TotalRewardPoints', 'totalRewardPoints')}`
    ).join('\n---\n');
}

// MCP Tool definitions
const TOOLS = [
  {
    name: 'search_transactions',
    description:
      'Search and filter transactions from the eCommerce Transactions table. ' +
      'Use this for any question about purchases, customers, grocery items, amounts, quantities, or reward points. ' +
      'All parameters are optional — combine them freely.',
    inputSchema: {
      type: 'object',
      properties: {
        mobile_number: {
          type: 'string',
          description: 'Filter by customer mobile number (exact match). Example: "9876543210"',
        },
        grocery_name: {
          type: 'string',
          description: 'Filter by grocery name (partial/contains match). Example: "milk"',
        },
        min_amount: { type: 'number', description: 'Minimum transaction amount' },
        max_amount: { type: 'number', description: 'Maximum transaction amount' },
        min_quantity: { type: 'number', description: 'Minimum quantity purchased' },
        max_quantity: { type: 'number', description: 'Maximum quantity purchased' },
        min_reward: { type: 'number', description: 'Minimum reward points' },
        max_reward: { type: 'number', description: 'Maximum reward points' },
        order_by: {
          type: 'string',
          description: 'Column to sort by',
          enum: ['TransactionID', 'Customer_MobileNumber', 'GroceryName', 'Amount', 'Quantity', 'RewardPoints'],
        },
        order_dir: {
          type: 'string',
          description: 'Sort direction',
          enum: ['ASC', 'DESC'],
        },
        page: { type: 'number', description: 'Page number for pagination (default: 1)' },
        page_size: { type: 'number', description: 'Results per page (default: 50, max: 1000)' },
      },
    },
  },
  {
    name: 'get_transaction_stats',
    description:
      'Get aggregated statistics: totals, averages, counts. ' +
      'Use for "total sales", "average order value", "top groceries", "best customers". ' +
      'group_by="GroceryName" ranks items; group_by="Customer_MobileNumber" ranks customers; group_by="none" gives overall totals.',
    inputSchema: {
      type: 'object',
      properties: {
        group_by: {
          type: 'string',
          description: 'Aggregate by this field',
          enum: ['Customer_MobileNumber', 'GroceryName', 'none'],
        },
        mobile_number: { type: 'string', description: 'Limit stats to this customer mobile number' },
        grocery_name: { type: 'string', description: 'Limit stats to this grocery item (partial match)' },
      },
    },
  },
  {
    name: 'get_transaction_by_id',
    description: 'Retrieve a single transaction record by its TransactionID.',
    inputSchema: {
      type: 'object',
      required: ['transaction_id'],
      properties: {
        transaction_id: { type: 'number', description: 'The TransactionID to look up' },
      },
    },
  },
];

// MCP Server
const server = new Server(
  { name: 'transactions-mcp', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // ── search_transactions ──────────────────────────────────────────────────
    if (name === 'search_transactions') {
      const allowedOrderBy = ['TransactionID', 'Customer_MobileNumber', 'GroceryName', 'Amount', 'Quantity', 'RewardPoints'];
      const orderBy = allowedOrderBy.includes(args.order_by) ? args.order_by : 'TransactionID';
      const orderDir = args.order_dir?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      const pageSize = Math.min(parseInt(args.page_size) || 50, 1000);
      const pageNumber = parseInt(args.page) || 1;

      const where = buildWhere(args);
      const sql =
        `SELECT TransactionID, Customer_MobileNumber, GroceryName, Amount, Quantity, RewardPoints ` +
        `FROM [eCommerce].[dbo].[Transactions] ` +
        `${where} ` +
        `ORDER BY ${orderBy} ${orderDir}`;

      const result = await executeQuery(sql, pageNumber, pageSize);
      const rows = result?.data ?? result ?? [];
      const text = `Found ${rows.length} transaction(s) (page ${pageNumber}):\n\n${formatRows(rows)}`;
      return { content: [{ type: 'text', text }] };
    }

    // ── get_transaction_stats ────────────────────────────────────────────────
    if (name === 'get_transaction_stats') {
      const groupBy = args.group_by || 'none';
      const where = buildWhere(args);
      let sql;

      if (groupBy !== 'none') {
        sql =
          `SELECT ${groupBy}, ` +
          `COUNT(*) AS TotalTransactions, ` +
          `SUM(Amount) AS TotalAmount, ` +
          `AVG(Amount) AS AvgAmount, ` +
          `SUM(Quantity) AS TotalQuantity, ` +
          `SUM(RewardPoints) AS TotalRewardPoints ` +
          `FROM [eCommerce].[dbo].[Transactions] ` +
          `${where} ` +
          `GROUP BY ${groupBy} ` +
          `ORDER BY TotalAmount DESC`;
      } else {
        sql =
          `SELECT ` +
          `COUNT(*) AS TotalTransactions, ` +
          `SUM(Amount) AS TotalAmount, ` +
          `AVG(Amount) AS AvgAmount, ` +
          `MAX(Amount) AS MaxAmount, ` +
          `MIN(Amount) AS MinAmount, ` +
          `SUM(Quantity) AS TotalQuantity, ` +
          `SUM(RewardPoints) AS TotalRewardPoints, ` +
          `AVG(CAST(RewardPoints AS FLOAT)) AS AvgRewardPoints ` +
          `FROM [eCommerce].[dbo].[Transactions] ` +
          `${where}`;
      }

      const result = await executeQuery(sql, 1, 1000);
      const rows = result?.data ?? result ?? [];
      return { content: [{ type: 'text', text: formatStats(rows, groupBy) }] };
    }

    // ── get_transaction_by_id ────────────────────────────────────────────────
    if (name === 'get_transaction_by_id') {
      const id = parseInt(args.transaction_id);
      if (isNaN(id)) throw new Error('transaction_id must be a number');

      const sql =
        `SELECT TransactionID, Customer_MobileNumber, GroceryName, Amount, Quantity, RewardPoints ` +
        `FROM [eCommerce].[dbo].[Transactions] ` +
        `WHERE TransactionID = ${id}`;

      const result = await executeQuery(sql, 1, 1);
      const rows = result?.data ?? result ?? [];
      if (rows.length === 0) return { content: [{ type: 'text', text: `Transaction #${id} not found.` }] };
      return { content: [{ type: 'text', text: formatRows(rows) }] };
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };

  } catch (err) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${err.message}\n\nEnsure your Web API is running at ${API_BASE}`,
      }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
