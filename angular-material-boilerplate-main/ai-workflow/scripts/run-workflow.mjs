#!/usr/bin/env node
/**
 * Angular → React Migration Orchestrator
 *
 * Runs all 8 agents in sequence via the Claude API (claude-sonnet-4-6).
 * Each agent's output is used as context for the next agent.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your_key node ai-workflow/scripts/run-workflow.mjs
 *
 * Options:
 *   --from=N    Resume from agent N (default: 1)
 *   --only=N    Run only agent N
 *   --dry-run   Print prompts without calling the API
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..', '..');
const WORKFLOW  = join(__dirname, '..');
const OUTPUT    = join(WORKFLOW, 'output');
const CHECKPTS  = join(OUTPUT, 'checkpoints');

// ─── CLI args ───────────────────────────────────────────────────────────────
const args        = process.argv.slice(2);
const fromArg     = args.find(a => a.startsWith('--from='));
const onlyArg     = args.find(a => a.startsWith('--only='));
const dryRun      = args.includes('--dry-run');
const fromAgent   = fromArg ? parseInt(fromArg.split('=')[1]) : 1;
const onlyAgent   = onlyArg ? parseInt(onlyArg.split('=')[1]) : null;

// ─── Agent definitions ──────────────────────────────────────────────────────
const AGENTS = [
  { id: 1, name: 'Analysis',          file: '01-analysis-agent.md',           checkpoint: '01-analysis.done' },
  { id: 2, name: 'Scaffold',          file: '02-scaffold-agent.md',           checkpoint: '02-scaffold.done' },
  { id: 3, name: 'Component Convert', file: '03-component-converter-agent.md',checkpoint: '03-components.done' },
  { id: 4, name: 'Router',            file: '04-router-agent.md',             checkpoint: '04-router.done' },
  { id: 5, name: 'Theme',             file: '05-theme-agent.md',              checkpoint: '05-theme.done' },
  { id: 6, name: 'Forms',             file: '06-form-agent.md',               checkpoint: '06-forms.done' },
  { id: 7, name: 'Tests',             file: '07-test-agent.md',               checkpoint: '07-tests.done' },
  { id: 8, name: 'Validation',        file: '08-validation-agent.md',         checkpoint: '08-validation.done' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ensureDirs() {
  [OUTPUT, CHECKPTS].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });
}

function checkpointExists(name) {
  return existsSync(join(CHECKPTS, name));
}

function writeCheckpoint(name) {
  writeFileSync(join(CHECKPTS, name), JSON.stringify({ status: 'done', timestamp: new Date().toISOString() }));
}

function readAgentPrompt(file) {
  return readFileSync(join(WORKFLOW, 'agents', file), 'utf8');
}

function readFileIfExists(path) {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
}

function log(agentId, msg) {
  const ts = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${ts}] Agent ${agentId} | ${msg}`);
}

// ─── Claude API call ─────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, agentId) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable not set');

  const body = {
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  log(agentId, 'Calling Claude API...');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ─── System prompt (from copilot-instructions.md) ────────────────────────────
function buildSystemPrompt() {
  const instructions = readFileIfExists(join(ROOT, '.github', 'copilot-instructions.md')) ?? '';
  const architecture = readFileIfExists(join(WORKFLOW, 'react-architecture.md')) ?? '';
  const conversionMap = readFileIfExists(join(WORKFLOW, 'conversion-map.json')) ?? '';

  return `You are an expert Angular-to-React migration agent operating autonomously.
You will be given an agent prompt file. Execute ALL steps in that prompt completely.
Write all output files to the React project at d:/Projects/react-app/.
When reading Angular source, files are at d:/Projects/angular-material-boilerplate-main/src/.

--- COPILOT INSTRUCTIONS ---
${instructions}

--- REACT ARCHITECTURE ---
${architecture}

--- CONVERSION MAP ---
${conversionMap}
`;
}

// ─── Per-agent context injection ─────────────────────────────────────────────
function buildUserPrompt(agent) {
  const agentPrompt = readAgentPrompt(agent.file);
  const report = readFileIfExists(join(OUTPUT, 'conversion-report.json'));

  let context = `# Execute Agent ${agent.id}: ${agent.name}\n\n`;
  if (report && agent.id > 1) {
    context += `## Conversion Report (from Agent 1)\n\`\`\`json\n${report}\n\`\`\`\n\n`;
  }
  context += `## Agent Instructions\n\n${agentPrompt}`;
  return context;
}

// ─── Main orchestration loop ─────────────────────────────────────────────────
async function main() {
  ensureDirs();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Angular → React Migration Workflow');
  console.log('  Angular project: d:/Projects/angular-material-boilerplate-main');
  console.log('  React output:    d:/Projects/react-app');
  console.log('═══════════════════════════════════════════════════════\n');

  const systemPrompt = buildSystemPrompt();
  const agentsToRun = onlyAgent
    ? AGENTS.filter(a => a.id === onlyAgent)
    : AGENTS.filter(a => a.id >= fromAgent);

  for (const agent of agentsToRun) {
    console.log(`\n┌── Agent ${agent.id}: ${agent.name} ${'─'.repeat(40 - agent.name.length)}`);

    // Check checkpoint
    if (checkpointExists(agent.checkpoint)) {
      console.log(`│  ✓ Already complete (checkpoint exists) — skipping`);
      console.log(`└${'─'.repeat(50)}`);
      continue;
    }

    // Dry run
    if (dryRun) {
      console.log(`│  [DRY RUN] Would call Claude with agent ${agent.id} prompt`);
      console.log(`└${'─'.repeat(50)}`);
      continue;
    }

    try {
      log(agent.id, `Starting...`);
      const userPrompt = buildUserPrompt(agent);
      const result = await callClaude(systemPrompt, userPrompt, agent.id);

      // Save agent output
      const outputFile = join(OUTPUT, `agent-${agent.id.toString().padStart(2, '0')}-output.md`);
      writeFileSync(outputFile, `# Agent ${agent.id} Output\n\n${result}`);
      log(agent.id, `Output saved to ${outputFile}`);

      // Mark checkpoint (agent is responsible for creating the actual checkpoint file,
      // but we also set it here as a fallback)
      writeCheckpoint(agent.checkpoint);
      log(agent.id, `✓ Complete`);

    } catch (err) {
      console.error(`│  ✗ FAILED: ${err.message}`);
      console.log(`└${'─'.repeat(50)}`);
      process.exit(1);
    }

    console.log(`└${'─'.repeat(50)}`);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Workflow Complete!');
  const report = readFileIfExists(join(OUTPUT, 'validation-report.json'));
  if (report) {
    const parsed = JSON.parse(report);
    console.log(`  Final status: ${parsed.status}`);
    if (parsed.tests) console.log(`  Tests: ${parsed.tests.passed}/${parsed.tests.total} passed`);
  }
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
