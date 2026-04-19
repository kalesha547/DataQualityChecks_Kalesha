/**
 * Shared utilities for the migration workflow tools.
 * Handles checkpoint reading/writing, shell execution,
 * and structured result formatting.
 */

import * as fs   from 'fs';
import * as path from 'path';
import * as cp   from 'child_process';
import * as vscode from 'vscode';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentInfo {
  id:         number;
  name:       string;
  checkpoint: string;
  done:       boolean;
}

export interface ShellResult {
  stdout:   string;
  stderr:   string;
  exitCode: number;
}

export interface ValidationResult {
  step:     string;
  status:   'PASS' | 'FAIL' | 'SKIP';
  output:   string;
  errors:   string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

export const AGENTS: Omit<AgentInfo, 'done'>[] = [
  { id: 1, name: 'Analysis',           checkpoint: '01-analysis.done'  },
  { id: 2, name: 'Scaffold',           checkpoint: '02-scaffold.done'  },
  { id: 3, name: 'Component Convert',  checkpoint: '03-components.done'},
  { id: 4, name: 'Router',             checkpoint: '04-router.done'    },
  { id: 5, name: 'Theme',              checkpoint: '05-theme.done'     },
  { id: 6, name: 'Forms',              checkpoint: '06-forms.done'     },
  { id: 7, name: 'Tests',              checkpoint: '07-tests.done'     },
  { id: 8, name: 'Validation',         checkpoint: '08-validation.done'},
];

/**
 * Derive the list of Angular component class names from a conversion report.
 * Falls back to scanning .component.ts files directly if no report is available.
 */
export function getAngularComponents(
  reportOrProjectPath: Record<string, unknown> | string
): string[] {
  if (typeof reportOrProjectPath === 'object') {
    const components = reportOrProjectPath.components as Array<{ angularClass?: string }> | undefined;
    return (components ?? []).map(c => c.angularClass ?? '').filter(Boolean);
  }
  // Path-based fallback: scan src/ for .component.ts and extract class names
  const srcRoot = path.join(reportOrProjectPath, 'src');
  const files   = findAngularComponents(srcRoot);
  return files.map(f => {
    const content = fs.readFileSync(f, 'utf8');
    return (content.match(/export class (\w+Component)/) ?? [])[1] ?? '';
  }).filter(Boolean);
}

/** @deprecated Use getAngularComponents() — this static list is project-specific */
export const ANGULAR_COMPONENTS = [
  'AppComponent',
  'LayoutComponent',
  'DashboardComponent',
  'DragDropComponent',
  'TableComponent',
  'AddressFormComponent',
  'TreeComponent',
  'ThemeToggleComponent',
];

// ── Checkpoint helpers ───────────────────────────────────────────────────────

export function checkpointDir(angularProjectPath: string): string {
  return path.join(angularProjectPath, 'ai-workflow', 'output', 'checkpoints');
}

export function outputDir(angularProjectPath: string): string {
  return path.join(angularProjectPath, 'ai-workflow', 'output');
}

export function getAgentStatus(angularProjectPath: string): AgentInfo[] {
  const cpDir = checkpointDir(angularProjectPath);
  return AGENTS.map(agent => ({
    ...agent,
    done: fs.existsSync(path.join(cpDir, agent.checkpoint)),
  }));
}

export function writeCheckpoint(angularProjectPath: string, checkpoint: string): void {
  const cpDir = checkpointDir(angularProjectPath);
  fs.mkdirSync(cpDir, { recursive: true });
  fs.writeFileSync(
    path.join(cpDir, checkpoint),
    JSON.stringify({ status: 'done', timestamp: new Date().toISOString() })
  );
}

export function readConversionReport(angularProjectPath: string): object | null {
  const reportPath = path.join(outputDir(angularProjectPath), 'conversion-report.json');
  if (!fs.existsSync(reportPath)) return null;
  try { return JSON.parse(fs.readFileSync(reportPath, 'utf8')); }
  catch { return null; }
}

// ── Shell execution ──────────────────────────────────────────────────────────

export function runShell(
  command: string,
  cwd: string,
  token?: vscode.CancellationToken
): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const proc = cp.exec(command, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: err?.code ?? 0,
      });
    });

    token?.onCancellationRequested(() => {
      proc.kill();
      reject(new Error('Operation cancelled'));
    });
  });
}

// ── Result formatting ────────────────────────────────────────────────────────

export function makeResult(text: string): vscode.LanguageModelToolResult {
  return new vscode.LanguageModelToolResult([
    new vscode.LanguageModelTextPart(text),
  ]);
}

export function formatAgentTable(agents: AgentInfo[]): string {
  const lines = [
    '## Migration Workflow Status\n',
    '| # | Agent           | Status     |',
    '|---|-----------------|------------|',
    ...agents.map(a =>
      `| ${a.id} | ${a.name.padEnd(15)} | ${a.done ? '✅ Complete' : '⏳ Pending '} |`
    ),
  ];
  const doneCount = agents.filter(a => a.done).length;
  lines.push('');
  lines.push(`**Progress: ${doneCount}/${agents.length} agents complete**`);
  if (doneCount < agents.length) {
    const nextAgent = agents.find(a => !a.done);
    lines.push(`**Next: Agent ${nextAgent?.id} — ${nextAgent?.name}**`);
    lines.push(`\nRun \`#ng2reactPipeline\` to continue from Agent ${nextAgent?.id}.`);
  } else {
    lines.push('\n🎉 **Migration complete!** Run `npm run dev` in the React project.');
  }
  return lines.join('\n');
}

export function formatValidationResults(results: ValidationResult[]): string {
  const lines = ['## Validation Results\n'];
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️' : '❌';
    lines.push(`### ${icon} ${r.step}: ${r.status}`);
    if (r.errors.length > 0) {
      lines.push('**Errors:**');
      r.errors.forEach(e => lines.push(`- ${e}`));
    }
    if (r.output) {
      lines.push('```');
      lines.push(r.output.slice(0, 800)); // cap output
      lines.push('```');
    }
    lines.push('');
  }
  const allPass = results.every(r => r.status !== 'FAIL');
  lines.push(allPass
    ? '**Overall: ✅ PASS — React project is ready to run.**'
    : '**Overall: ❌ FAIL — See errors above.**'
  );
  return lines.join('\n');
}

// ── File scan helpers ────────────────────────────────────────────────────────

export function findAngularComponents(srcPath: string): string[] {
  const found: string[] = [];
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.component.ts')) {
        found.push(path.join(dir, entry.name));
      }
    }
  }
  walk(srcPath);
  return found;
}

export function getPackageVersion(projectPath: string, pkg: string): string | null {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    return pkgJson.dependencies?.[pkg] ?? pkgJson.devDependencies?.[pkg] ?? null;
  } catch {
    return null;
  }
}
