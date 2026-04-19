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
exports.ValidateTool = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workflow_1 = require("../utils/workflow");
function parseTypeScriptErrors(output) {
    return output
        .split('\n')
        .filter(line => line.includes('error TS'))
        .map(line => line.trim())
        .slice(0, 20); // cap at 20 errors
}
function parseTestSummary(output) {
    const match = output.match(/Tests\s+(\d+) failed\s+\|\s+(\d+) passed/);
    if (match)
        return { passed: parseInt(match[2]), failed: parseInt(match[1]), total: parseInt(match[1]) + parseInt(match[2]) };
    const passOnly = output.match(/Tests\s+(\d+) passed/);
    if (passOnly)
        return { passed: parseInt(passOnly[1]), failed: 0, total: parseInt(passOnly[1]) };
    return { passed: 0, failed: 0, total: 0 };
}
class ValidateTool {
    constructor(_workspaceRoot) {
        this._workspaceRoot = _workspaceRoot;
    }
    async invoke(options, token) {
        const reactPath = options.input.reactProjectPath;
        const steps = options.input.steps ?? ['typecheck', 'test', 'build'];
        if (!fs.existsSync(path.join(reactPath, 'package.json'))) {
            return (0, workflow_1.makeResult)(`❌ React project not found at \`${reactPath}\`.\n` +
                `Run \`#ng2reactScaffold\` + \`#ng2reactConvert\` first.`);
        }
        const results = [];
        // ── Step 1: TypeScript check ──────────────────────────────────────────────
        if (steps.includes('typecheck')) {
            if (token.isCancellationRequested)
                return (0, workflow_1.makeResult)('❌ Cancelled');
            const r = await (0, workflow_1.runShell)('npx tsc --noEmit', reactPath, token);
            const errors = parseTypeScriptErrors(r.stdout + r.stderr);
            results.push({
                step: 'TypeScript Check',
                status: r.exitCode === 0 ? 'PASS' : 'FAIL',
                output: r.exitCode === 0 ? 'No type errors found.' : '',
                errors,
            });
        }
        else {
            results.push({ step: 'TypeScript Check', status: 'SKIP', output: '', errors: [] });
        }
        // ── Step 2: Tests ─────────────────────────────────────────────────────────
        if (steps.includes('test')) {
            if (token.isCancellationRequested)
                return (0, workflow_1.makeResult)('❌ Cancelled');
            const r = await (0, workflow_1.runShell)('npx vitest run', reactPath, token);
            const summary = parseTestSummary(r.stdout + r.stderr);
            const lastLines = (r.stdout + r.stderr).split('\n').slice(-8).join('\n');
            results.push({
                step: 'Tests (Vitest)',
                status: r.exitCode === 0 ? 'PASS' : 'FAIL',
                output: `${summary.passed}/${summary.total} tests passed\n${lastLines}`,
                errors: r.exitCode !== 0
                    ? (r.stdout + r.stderr).split('\n').filter(l => l.includes('✗') || l.includes('×') || l.includes('FAIL')).slice(0, 10)
                    : [],
            });
        }
        else {
            results.push({ step: 'Tests (Vitest)', status: 'SKIP', output: '', errors: [] });
        }
        // ── Step 3: Build ─────────────────────────────────────────────────────────
        if (steps.includes('build')) {
            if (token.isCancellationRequested)
                return (0, workflow_1.makeResult)('❌ Cancelled');
            const r = await (0, workflow_1.runShell)('npm run build', reactPath, token);
            const bundleLines = (r.stdout + r.stderr).split('\n').filter(l => l.includes('kB') || l.includes('✓')).join('\n');
            results.push({
                step: 'Production Build',
                status: r.exitCode === 0 ? 'PASS' : 'FAIL',
                output: bundleLines || r.stdout.slice(-300),
                errors: r.exitCode !== 0
                    ? (r.stdout + r.stderr).split('\n').filter(l => l.toLowerCase().includes('error')).slice(0, 10)
                    : [],
            });
        }
        else {
            results.push({ step: 'Production Build', status: 'SKIP', output: '', errors: [] });
        }
        // ── Write checkpoint & validation report ─────────────────────────────────
        const allPass = results.every(r => r.status !== 'FAIL');
        const angularPath = path.resolve(reactPath, '..', 'angular-material-boilerplate-main');
        if (fs.existsSync(angularPath)) {
            (0, workflow_1.writeCheckpoint)(angularPath, '08-validation.done');
            // Write validation report
            const reportDir = path.join(angularPath, 'ai-workflow', 'output');
            fs.mkdirSync(reportDir, { recursive: true });
            fs.writeFileSync(path.join(reportDir, 'validation-report.json'), JSON.stringify({
                timestamp: new Date().toISOString(),
                status: allPass ? 'PASS' : 'FAIL',
                results: results.map(r => ({ step: r.step, status: r.status, errors: r.errors })),
            }, null, 2));
        }
        const summary = (0, workflow_1.formatValidationResults)(results);
        const runCmd = allPass
            ? `\n---\n✅ **Ready to run:** \`cd ${reactPath} && npm run dev\``
            : '\n---\n❌ Fix the errors above, then re-run \`#ng2reactValidate\`.';
        return (0, workflow_1.makeResult)(summary + runCmd);
    }
    prepareInvocation(options, _token) {
        const steps = options.input.steps ?? ['typecheck', 'test', 'build'];
        return {
            invocationMessage: `Running validation (${steps.join(', ')})…`,
            confirmationMessages: {
                title: 'Validate React Project',
                message: new vscode.MarkdownString(`Run **${steps.join(' + ')}** on \`${options.input.reactProjectPath}\`?`),
            },
        };
    }
}
exports.ValidateTool = ValidateTool;
//# sourceMappingURL=validateTool.js.map