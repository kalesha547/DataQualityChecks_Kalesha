"use strict";
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const statusTool_1 = require("./tools/statusTool");
const analyzeTool_1 = require("./tools/analyzeTool");
const scaffoldTool_1 = require("./tools/scaffoldTool");
const convertTool_1 = require("./tools/convertTool");
const validateTool_1 = require("./tools/validateTool");
const pipelineTool_1 = require("./tools/pipelineTool");
function activate(context) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
    // ── Register all 6 Copilot LM Tools ──────────────────────────────────────
    context.subscriptions.push(vscode.lm.registerTool('ng2react_status', new statusTool_1.StatusTool(workspaceRoot)), vscode.lm.registerTool('ng2react_analyze', new analyzeTool_1.AnalyzeTool(workspaceRoot)), vscode.lm.registerTool('ng2react_scaffold', new scaffoldTool_1.ScaffoldTool(workspaceRoot)), vscode.lm.registerTool('ng2react_convert', new convertTool_1.ConvertTool(workspaceRoot)), vscode.lm.registerTool('ng2react_validate', new validateTool_1.ValidateTool(workspaceRoot)), vscode.lm.registerTool('ng2react_run_pipeline', new pipelineTool_1.PipelineTool(workspaceRoot)));
    vscode.window.showInformationMessage('Angular → React Migration Agent ready. Use #ng2reactStatus in Copilot Chat to start.');
}
function deactivate() {
    // Disposables are cleaned up automatically via context.subscriptions
}
//# sourceMappingURL=extension.js.map