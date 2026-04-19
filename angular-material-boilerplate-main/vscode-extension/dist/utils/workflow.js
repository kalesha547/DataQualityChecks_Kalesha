"use strict";
/**
 * Shared utilities for the migration workflow tools.
 * Handles checkpoint reading/writing, shell execution,
 * and structured result formatting.
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
exports.ANGULAR_COMPONENTS = exports.AGENTS = void 0;
exports.getAngularComponents = getAngularComponents;
exports.checkpointDir = checkpointDir;
exports.outputDir = outputDir;
exports.getAgentStatus = getAgentStatus;
exports.writeCheckpoint = writeCheckpoint;
exports.readConversionReport = readConversionReport;
exports.runShell = runShell;
exports.makeResult = makeResult;
exports.formatAgentTable = formatAgentTable;
exports.formatValidationResults = formatValidationResults;
exports.findAngularComponents = findAngularComponents;
exports.getPackageVersion = getPackageVersion;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
const vscode = __importStar(require("vscode"));
// ── Constants ────────────────────────────────────────────────────────────────
exports.AGENTS = [
    { id: 1, name: 'Analysis', checkpoint: '01-analysis.done' },
    { id: 2, name: 'Scaffold', checkpoint: '02-scaffold.done' },
    { id: 3, name: 'Component Convert', checkpoint: '03-components.done' },
    { id: 4, name: 'Router', checkpoint: '04-router.done' },
    { id: 5, name: 'Theme', checkpoint: '05-theme.done' },
    { id: 6, name: 'Forms', checkpoint: '06-forms.done' },
    { id: 7, name: 'Tests', checkpoint: '07-tests.done' },
    { id: 8, name: 'Validation', checkpoint: '08-validation.done' },
];
/**
 * Derive the list of Angular component class names from a conversion report.
 * Falls back to scanning .component.ts files directly if no report is available.
 */
function getAngularComponents(reportOrProjectPath) {
    if (typeof reportOrProjectPath === 'object') {
        const components = reportOrProjectPath.components;
        return (components ?? []).map(c => c.angularClass ?? '').filter(Boolean);
    }
    // Path-based fallback: scan src/ for .component.ts and extract class names
    const srcRoot = path.join(reportOrProjectPath, 'src');
    const files = findAngularComponents(srcRoot);
    return files.map(f => {
        const content = fs.readFileSync(f, 'utf8');
        return (content.match(/export class (\w+Component)/) ?? [])[1] ?? '';
    }).filter(Boolean);
}
/** @deprecated Use getAngularComponents() — this static list is project-specific */
exports.ANGULAR_COMPONENTS = [
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
function checkpointDir(angularProjectPath) {
    return path.join(angularProjectPath, 'ai-workflow', 'output', 'checkpoints');
}
function outputDir(angularProjectPath) {
    return path.join(angularProjectPath, 'ai-workflow', 'output');
}
function getAgentStatus(angularProjectPath) {
    const cpDir = checkpointDir(angularProjectPath);
    return exports.AGENTS.map(agent => ({
        ...agent,
        done: fs.existsSync(path.join(cpDir, agent.checkpoint)),
    }));
}
function writeCheckpoint(angularProjectPath, checkpoint) {
    const cpDir = checkpointDir(angularProjectPath);
    fs.mkdirSync(cpDir, { recursive: true });
    fs.writeFileSync(path.join(cpDir, checkpoint), JSON.stringify({ status: 'done', timestamp: new Date().toISOString() }));
}
function readConversionReport(angularProjectPath) {
    const reportPath = path.join(outputDir(angularProjectPath), 'conversion-report.json');
    if (!fs.existsSync(reportPath))
        return null;
    try {
        return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    }
    catch {
        return null;
    }
}
// ── Shell execution ──────────────────────────────────────────────────────────
function runShell(command, cwd, token) {
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
function makeResult(text) {
    return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(text),
    ]);
}
function formatAgentTable(agents) {
    const lines = [
        '## Migration Workflow Status\n',
        '| # | Agent           | Status     |',
        '|---|-----------------|------------|',
        ...agents.map(a => `| ${a.id} | ${a.name.padEnd(15)} | ${a.done ? '✅ Complete' : '⏳ Pending '} |`),
    ];
    const doneCount = agents.filter(a => a.done).length;
    lines.push('');
    lines.push(`**Progress: ${doneCount}/${agents.length} agents complete**`);
    if (doneCount < agents.length) {
        const nextAgent = agents.find(a => !a.done);
        lines.push(`**Next: Agent ${nextAgent?.id} — ${nextAgent?.name}**`);
        lines.push(`\nRun \`#ng2reactPipeline\` to continue from Agent ${nextAgent?.id}.`);
    }
    else {
        lines.push('\n🎉 **Migration complete!** Run `npm run dev` in the React project.');
    }
    return lines.join('\n');
}
function formatValidationResults(results) {
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
        : '**Overall: ❌ FAIL — See errors above.**');
    return lines.join('\n');
}
// ── File scan helpers ────────────────────────────────────────────────────────
function findAngularComponents(srcPath) {
    const found = [];
    function walk(dir) {
        if (!fs.existsSync(dir))
            return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
                walk(path.join(dir, entry.name));
            }
            else if (entry.name.endsWith('.component.ts')) {
                found.push(path.join(dir, entry.name));
            }
        }
    }
    walk(srcPath);
    return found;
}
function getPackageVersion(projectPath, pkg) {
    try {
        const pkgJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
        return pkgJson.dependencies?.[pkg] ?? pkgJson.devDependencies?.[pkg] ?? null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=workflow.js.map