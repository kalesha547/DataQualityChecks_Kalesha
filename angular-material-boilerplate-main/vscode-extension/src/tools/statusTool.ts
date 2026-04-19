import * as vscode from 'vscode';
import * as path   from 'path';
import * as fs     from 'fs';
import {
  getAgentStatus,
  formatAgentTable,
  makeResult,
  readConversionReport,
} from '../utils/workflow';

interface StatusInput {
  angularProjectPath?: string;
}

export class StatusTool implements vscode.LanguageModelTool<StatusInput> {
  constructor(private readonly workspaceRoot: string) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<StatusInput>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const projectPath = options.input.angularProjectPath ?? this.workspaceRoot;

    // ── Verify this is an Angular project ────────────────────────────────────
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return makeResult(
        `❌ No package.json found at: ${projectPath}\n` +
        `Provide the correct \`angularProjectPath\`.`
      );
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const angularVersion = pkg.dependencies?.['@angular/core'] ?? 'unknown';
    const isAngular = !!pkg.dependencies?.['@angular/core'];

    if (!isAngular) {
      return makeResult(
        `⚠️ Project at ${projectPath} does not appear to be an Angular project.\n` +
        `Expected \`@angular/core\` in dependencies.`
      );
    }

    // ── Agent checkpoints ─────────────────────────────────────────────────────
    const agents = getAgentStatus(projectPath);
    const report = readConversionReport(projectPath);

    const lines: string[] = [
      `## Angular → React Migration Status`,
      ``,
      `**Project:** \`${projectPath}\``,
      `**Angular version:** ${angularVersion}`,
      ``,
      formatAgentTable(agents),
    ];

    if (report) {
      const r = report as Record<string, unknown>;
      lines.push('');
      lines.push('### Conversion Report Summary');
      lines.push(`- Analysis date: ${r.analysisDate ?? 'n/a'}`);
      lines.push(`- Total components: ${r.totalComponents ?? 'n/a'}`);
    }

    // ── React project check ───────────────────────────────────────────────────
    const reactPath = path.join(path.dirname(projectPath), 'react-app');
    if (fs.existsSync(reactPath)) {
      const reactPkg = path.join(reactPath, 'package.json');
      if (fs.existsSync(reactPkg)) {
        const rp = JSON.parse(fs.readFileSync(reactPkg, 'utf8'));
        lines.push('');
        lines.push(`### React Project`);
        lines.push(`📦 Found at: \`${reactPath}\``);
        lines.push(`   React version: ${rp.dependencies?.['react'] ?? 'unknown'}`);
        lines.push(`   MUI version:   ${rp.dependencies?.['@mui/material'] ?? 'unknown'}`);
        lines.push(`   Run: \`cd ${reactPath} && npm run dev\``);
      }
    }

    return makeResult(lines.join('\n'));
  }

  prepareInvocation(
    _options: vscode.LanguageModelToolInvocationPrepareOptions<StatusInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: 'Checking migration status…',
    };
  }
}
