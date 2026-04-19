"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineTool = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workflow_1 = require("../utils/workflow");
class PipelineTool {
    constructor(_workspaceRoot) {
        this._workspaceRoot = _workspaceRoot;
    }
    async invoke(options, token) {
        const { angularProjectPath, reactOutputPath, dryRun = false } = options.input;
        const fromAgent = options.input.fromAgent ?? 1;
        const log = [
            `## 🚀 Angular → React Migration Pipeline`,
            ``,
            `**Angular project:** \`${angularProjectPath}\``,
            `**React output:**    \`${reactOutputPath}\``,
            `**Starting from:**   Agent ${fromAgent}`,
            dryRun ? '**Mode:** DRY RUN (no files written)' : '**Mode:** Live',
            ``,
        ];
        if (token.isCancellationRequested)
            return (0, workflow_1.makeResult)('❌ Cancelled before start');
        // ── Get current checkpoint state ─────────────────────────────────────────
        const agentStatus = (0, workflow_1.getAgentStatus)(angularProjectPath);
        // ── Agent 1: Analyze ─────────────────────────────────────────────────────
        if (fromAgent <= 1) {
            const a = agentStatus.find(a => a.id === 1);
            if (a.done) {
                log.push(`⏭️ **Agent 1 (Analysis):** Skipped — checkpoint exists`);
            }
            else if (dryRun) {
                log.push(`🔍 **Agent 1 (Analysis):** Would scan \`${angularProjectPath}/src\` → write conversion-report.json`);
            }
            else {
                log.push(`### Agent 1 — Analysis`);
                await vscode.commands.executeCommand('workbench.action.chat.open');
                // Delegate to analyze tool via lm.invokeTool
                try {
                    const result = await vscode.lm.invokeTool('ng2react_analyze', {
                        input: { angularProjectPath },
                        toolInvocationToken: options.toolInvocationToken,
                    }, token);
                    const text = result.content
                        .filter((c) => c instanceof vscode.LanguageModelTextPart)
                        .map(c => c.value).join('\n');
                    log.push(text);
                    (0, workflow_1.writeCheckpoint)(angularProjectPath, '01-analysis.done');
                    log.push('');
                }
                catch (e) {
                    log.push(`⚠️ Agent 1 failed: ${e.message}`);
                }
            }
        }
        if (token.isCancellationRequested)
            return (0, workflow_1.makeResult)(log.join('\n') + '\n\n❌ Cancelled');
        // ── Agent 2: Scaffold ─────────────────────────────────────────────────────
        if (fromAgent <= 2) {
            const a = agentStatus.find(a => a.id === 2);
            if (a.done && fs.existsSync(path.join(reactOutputPath, 'package.json'))) {
                log.push(`⏭️ **Agent 2 (Scaffold):** Skipped — React project already exists`);
            }
            else if (dryRun) {
                log.push(`🏗️ **Agent 2 (Scaffold):** Would create React project at \`${reactOutputPath}\` + npm install`);
            }
            else {
                log.push(`### Agent 2 — Scaffold`);
                try {
                    const result = await vscode.lm.invokeTool('ng2react_scaffold', {
                        input: { reactOutputPath },
                        toolInvocationToken: options.toolInvocationToken,
                    }, token);
                    const text = result.content
                        .filter((c) => c instanceof vscode.LanguageModelTextPart)
                        .map(c => c.value).join('\n');
                    log.push(text);
                    log.push('');
                }
                catch (e) {
                    log.push(`⚠️ Agent 2 failed: ${e.message}`);
                }
            }
        }
        if (token.isCancellationRequested)
            return (0, workflow_1.makeResult)(log.join('\n') + '\n\n❌ Cancelled');
        // ── Agents 3–7: Convert ──────────────────────────────────────────────────
        if (fromAgent <= 3) {
            const done37 = agentStatus.filter(a => a.id >= 3 && a.id <= 7).every(a => a.done);
            if (done37) {
                log.push(`⏭️ **Agents 3–7 (Convert):** Skipped — all checkpoints exist`);
            }
            else if (dryRun) {
                log.push(`🔄 **Agents 3–7 (Convert):** Would convert all 8 components + router + theme + forms + tests`);
            }
            else {
                log.push(`### Agents 3–7 — Convert`);
                try {
                    const result = await vscode.lm.invokeTool('ng2react_convert', {
                        input: { angularProjectPath, reactProjectPath: reactOutputPath, includeTests: true },
                        toolInvocationToken: options.toolInvocationToken,
                    }, token);
                    const text = result.content
                        .filter((c) => c instanceof vscode.LanguageModelTextPart)
                        .map(c => c.value).join('\n');
                    log.push(text);
                    log.push('');
                }
                catch (e) {
                    log.push(`⚠️ Agents 3–7 failed: ${e.message}`);
                }
            }
        }
        if (token.isCancellationRequested)
            return (0, workflow_1.makeResult)(log.join('\n') + '\n\n❌ Cancelled');
        // ── Agent 8: Validate ─────────────────────────────────────────────────────
        if (fromAgent <= 8) {
            const a = agentStatus.find(a => a.id === 8);
            if (a.done) {
                log.push(`⏭️ **Agent 8 (Validation):** Skipped — checkpoint exists`);
            }
            else if (dryRun) {
                log.push(`✅ **Agent 8 (Validation):** Would run tsc --noEmit + vitest run + vite build`);
            }
            else {
                log.push(`### Agent 8 — Validation`);
                try {
                    const result = await vscode.lm.invokeTool('ng2react_validate', {
                        input: { reactProjectPath: reactOutputPath },
                        toolInvocationToken: options.toolInvocationToken,
                    }, token);
                    const text = result.content
                        .filter((c) => c instanceof vscode.LanguageModelTextPart)
                        .map(c => c.value).join('\n');
                    log.push(text);
                    log.push('');
                }
                catch (e) {
                    log.push(`⚠️ Agent 8 failed: ${e.message}`);
                }
            }
        }
        // ── Final summary ─────────────────────────────────────────────────────────
        const finalStatus = (0, workflow_1.getAgentStatus)(angularProjectPath);
        const doneCount = finalStatus.filter(a => a.done).length;
        log.push('---');
        log.push(`## Pipeline Summary`);
        log.push(`**${doneCount}/8 agents complete**`);
        if (dryRun) {
            log.push(`\n**Dry run complete.** Remove \`dryRun: true\` and re-run to execute.`);
        }
        else if (doneCount === 8) {
            log.push(`\n🎉 **Migration complete!**`);
            log.push(`\n\`\`\`bash\ncd ${reactOutputPath}\nnpm run dev\n\`\`\``);
        }
        else {
            const nextAgent = finalStatus.find(a => !a.done);
            log.push(`\nResume from Agent ${nextAgent?.id} (${nextAgent?.name}) by running \`#ng2reactPipeline\` again.`);
        }
        // ── Also run shell commands fallback if lm.invokeTool isn't available ────
        if (!dryRun && doneCount < 8) {
            const shellResult = await (0, workflow_1.runShell)(`node ai-workflow/scripts/run-workflow.mjs --from=${doneCount + 1}`, angularProjectPath, token);
            if (shellResult.exitCode === 0) {
                log.push('\n```');
                log.push(shellResult.stdout.slice(0, 500));
                log.push('```');
            }
        }
        return (0, workflow_1.makeResult)(log.join('\n'));
    }
    prepareInvocation(options, _token) {
        const { dryRun, fromAgent = 1 } = options.input;
        return {
            invocationMessage: dryRun
                ? 'Previewing pipeline (dry run)…'
                : `Running migration pipeline from Agent ${fromAgent}…`,
            confirmationMessages: dryRun ? undefined : {
                title: 'Run Full Migration Pipeline',
                message: new vscode.MarkdownString(`Run **all ${9 - fromAgent} remaining agents** to convert Angular → React?\n\n` +
                    `- Angular: \`${options.input.angularProjectPath}\`\n` +
                    `- React output: \`${options.input.reactOutputPath}\``),
            },
        };
    }
}
exports.PipelineTool = PipelineTool;
//# sourceMappingURL=pipelineTool.js.map