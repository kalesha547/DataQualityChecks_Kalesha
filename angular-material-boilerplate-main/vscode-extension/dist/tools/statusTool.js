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
exports.StatusTool = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const workflow_1 = require("../utils/workflow");
class StatusTool {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
    }
    async invoke(options, _token) {
        const projectPath = options.input.angularProjectPath ?? this.workspaceRoot;
        // ── Verify this is an Angular project ────────────────────────────────────
        const pkgPath = path.join(projectPath, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            return (0, workflow_1.makeResult)(`❌ No package.json found at: ${projectPath}\n` +
                `Provide the correct \`angularProjectPath\`.`);
        }
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const angularVersion = pkg.dependencies?.['@angular/core'] ?? 'unknown';
        const isAngular = !!pkg.dependencies?.['@angular/core'];
        if (!isAngular) {
            return (0, workflow_1.makeResult)(`⚠️ Project at ${projectPath} does not appear to be an Angular project.\n` +
                `Expected \`@angular/core\` in dependencies.`);
        }
        // ── Agent checkpoints ─────────────────────────────────────────────────────
        const agents = (0, workflow_1.getAgentStatus)(projectPath);
        const report = (0, workflow_1.readConversionReport)(projectPath);
        const lines = [
            `## Angular → React Migration Status`,
            ``,
            `**Project:** \`${projectPath}\``,
            `**Angular version:** ${angularVersion}`,
            ``,
            (0, workflow_1.formatAgentTable)(agents),
        ];
        if (report) {
            const r = report;
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
        return (0, workflow_1.makeResult)(lines.join('\n'));
    }
    prepareInvocation(_options, _token) {
        return {
            invocationMessage: 'Checking migration status…',
        };
    }
}
exports.StatusTool = StatusTool;
//# sourceMappingURL=statusTool.js.map