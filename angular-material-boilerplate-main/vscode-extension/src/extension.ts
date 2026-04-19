/**
 * Angular → React Migration Agent — VS Code Extension
 *
 * Registers 6 Copilot Language Model Tools that automate the Angular→React
 * migration workflow. Each tool maps to one or more agents defined in
 * ai-workflow/agents/.
 *
 * Tools available in Copilot agent mode (@workspace):
 *   #ng2reactStatus        — check migration progress
 *   #ng2reactAnalyze       — Agent 1: scan Angular source
 *   #ng2reactScaffold      — Agent 2: create React project
 *   #ng2reactConvert       — Agents 3-6: convert components/router/theme/forms
 *   #ng2reactValidate      — Agent 8: TypeScript + tests + build
 *   #ng2reactPipeline      — run all agents end-to-end
 */

import * as vscode from 'vscode';
import { StatusTool }   from './tools/statusTool';
import { AnalyzeTool }  from './tools/analyzeTool';
import { ScaffoldTool } from './tools/scaffoldTool';
import { ConvertTool }  from './tools/convertTool';
import { ValidateTool } from './tools/validateTool';
import { PipelineTool } from './tools/pipelineTool';

export function activate(context: vscode.ExtensionContext): void {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

  // ── Register all 6 Copilot LM Tools ──────────────────────────────────────
  context.subscriptions.push(
    vscode.lm.registerTool('ng2react_status',       new StatusTool(workspaceRoot)),
    vscode.lm.registerTool('ng2react_analyze',      new AnalyzeTool(workspaceRoot)),
    vscode.lm.registerTool('ng2react_scaffold',     new ScaffoldTool(workspaceRoot)),
    vscode.lm.registerTool('ng2react_convert',      new ConvertTool(workspaceRoot)),
    vscode.lm.registerTool('ng2react_validate',     new ValidateTool(workspaceRoot)),
    vscode.lm.registerTool('ng2react_run_pipeline', new PipelineTool(workspaceRoot)),
  );

  vscode.window.showInformationMessage(
    'Angular → React Migration Agent ready. Use #ng2reactStatus in Copilot Chat to start.'
  );
}

export function deactivate(): void {
  // Disposables are cleaned up automatically via context.subscriptions
}
