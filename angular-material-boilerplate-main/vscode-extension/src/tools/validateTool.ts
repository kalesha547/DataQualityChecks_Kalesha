import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import {
  makeResult,
  writeCheckpoint,
  runShell,
  formatValidationResults,
  ValidationResult,
} from '../utils/workflow';

interface ValidateInput {
  reactProjectPath: string;
  steps?:           Array<'typecheck' | 'test' | 'build'>;
}

function parseTypeScriptErrors(output: string): string[] {
  return output
    .split('\n')
    .filter(line => line.includes('error TS'))
    .map(line => line.trim())
    .slice(0, 20); // cap at 20 errors
}

function parseTestSummary(output: string): { passed: number; failed: number; total: number } {
  const match = output.match(/Tests\s+(\d+) failed\s+\|\s+(\d+) passed/);
  if (match) return { passed: parseInt(match[2]), failed: parseInt(match[1]), total: parseInt(match[1]) + parseInt(match[2]) };
  const passOnly = output.match(/Tests\s+(\d+) passed/);
  if (passOnly) return { passed: parseInt(passOnly[1]), failed: 0, total: parseInt(passOnly[1]) };
  return { passed: 0, failed: 0, total: 0 };
}

export class ValidateTool implements vscode.LanguageModelTool<ValidateInput> {
  constructor(private readonly _workspaceRoot: string) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ValidateInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const reactPath = options.input.reactProjectPath;
    const steps     = options.input.steps ?? ['typecheck', 'test', 'build'];

    if (!fs.existsSync(path.join(reactPath, 'package.json'))) {
      return makeResult(
        `❌ React project not found at \`${reactPath}\`.\n` +
        `Run \`#ng2reactScaffold\` + \`#ng2reactConvert\` first.`
      );
    }

    const results: ValidationResult[] = [];

    // ── Step 1: TypeScript check ──────────────────────────────────────────────
    if (steps.includes('typecheck')) {
      if (token.isCancellationRequested) return makeResult('❌ Cancelled');
      const r = await runShell('npx tsc --noEmit', reactPath, token);
      const errors = parseTypeScriptErrors(r.stdout + r.stderr);
      results.push({
        step:   'TypeScript Check',
        status: r.exitCode === 0 ? 'PASS' : 'FAIL',
        output: r.exitCode === 0 ? 'No type errors found.' : '',
        errors,
      });
    } else {
      results.push({ step: 'TypeScript Check', status: 'SKIP', output: '', errors: [] });
    }

    // ── Step 2: Tests ─────────────────────────────────────────────────────────
    if (steps.includes('test')) {
      if (token.isCancellationRequested) return makeResult('❌ Cancelled');
      const r = await runShell('npx vitest run', reactPath, token);
      const summary = parseTestSummary(r.stdout + r.stderr);
      const lastLines = (r.stdout + r.stderr).split('\n').slice(-8).join('\n');
      results.push({
        step:   'Tests (Vitest)',
        status: r.exitCode === 0 ? 'PASS' : 'FAIL',
        output: `${summary.passed}/${summary.total} tests passed\n${lastLines}`,
        errors: r.exitCode !== 0
          ? (r.stdout + r.stderr).split('\n').filter(l => l.includes('✗') || l.includes('×') || l.includes('FAIL')).slice(0, 10)
          : [],
      });
    } else {
      results.push({ step: 'Tests (Vitest)', status: 'SKIP', output: '', errors: [] });
    }

    // ── Step 3: Build ─────────────────────────────────────────────────────────
    if (steps.includes('build')) {
      if (token.isCancellationRequested) return makeResult('❌ Cancelled');
      const r = await runShell('npm run build', reactPath, token);
      const bundleLines = (r.stdout + r.stderr).split('\n').filter(l => l.includes('kB') || l.includes('✓')).join('\n');
      results.push({
        step:   'Production Build',
        status: r.exitCode === 0 ? 'PASS' : 'FAIL',
        output: bundleLines || r.stdout.slice(-300),
        errors: r.exitCode !== 0
          ? (r.stdout + r.stderr).split('\n').filter(l => l.toLowerCase().includes('error')).slice(0, 10)
          : [],
      });
    } else {
      results.push({ step: 'Production Build', status: 'SKIP', output: '', errors: [] });
    }

    // ── Write checkpoint & validation report ─────────────────────────────────
    const allPass = results.every(r => r.status !== 'FAIL');

    const angularPath = path.resolve(reactPath, '..', 'angular-material-boilerplate-main');
    if (fs.existsSync(angularPath)) {
      writeCheckpoint(angularPath, '08-validation.done');
      // Write validation report
      const reportDir = path.join(angularPath, 'ai-workflow', 'output');
      fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportDir, 'validation-report.json'),
        JSON.stringify({
          timestamp: new Date().toISOString(),
          status:    allPass ? 'PASS' : 'FAIL',
          results:   results.map(r => ({ step: r.step, status: r.status, errors: r.errors })),
        }, null, 2)
      );
    }

    const summary = formatValidationResults(results);
    const runCmd  = allPass
      ? `\n---\n✅ **Ready to run:** \`cd ${reactPath} && npm run dev\``
      : '\n---\n❌ Fix the errors above, then re-run \`#ng2reactValidate\`.';

    return makeResult(summary + runCmd);
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ValidateInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    const steps = options.input.steps ?? ['typecheck', 'test', 'build'];
    return {
      invocationMessage: `Running validation (${steps.join(', ')})…`,
      confirmationMessages: {
        title:   'Validate React Project',
        message: new vscode.MarkdownString(
          `Run **${steps.join(' + ')}** on \`${options.input.reactProjectPath}\`?`
        ),
      },
    };
  }
}
