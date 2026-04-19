import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import {
  makeResult,
  writeCheckpoint,
  runShell,
} from '../utils/workflow';

interface ScaffoldInput {
  reactOutputPath:      string;
  angularProjectPath?:  string;   // used to read the report and write the checkpoint
  conversionReportPath?: string;
}

/**
 * Builds package.json dynamically based on what patterns were detected.
 * Only adds optional packages (dnd-kit, data-grid, etc.) when actually needed.
 */
function buildPackageJson(
  projectName: string,
  version: string,
  report: Record<string, unknown> | null
): string {
  type Patterns = {
    httpPatterns?: unknown[];
    guards?: Array<{ guardType?: string }>;
    stateManagement?: { type?: string };
    animations?: unknown[];
  };
  const patterns = (report?.patterns as Patterns) ?? {};
  const components = (report?.components as Array<Record<string, unknown>>) ?? [];

  const hasDnd     = components.some(c => JSON.stringify(c).includes('CdkDrag'));
  const hasDataGrid= components.some(c => JSON.stringify(c).includes('MatTable'));
  const hasTree    = components.some(c => JSON.stringify(c).includes('MatTree'));
  const hasHttp    = (patterns.httpPatterns?.length ?? 0) > 0;
  const hasCanDeactivate = (patterns.guards ?? []).some(g => g.guardType === 'CanDeactivate');
  const needsRedux = ['ngrx', 'ngxs'].includes(patterns.stateManagement?.type ?? '');
  const needsZustand = ['behaviorsubject', 'akita'].includes(patterns.stateManagement?.type ?? '');
  const hasAnimations = (patterns.animations as unknown[])?.length ?? 0 > 0;

  const deps: Record<string, string> = {
    react:                '^18.3.1',
    'react-dom':          '^18.3.1',
    '@mui/material':      '^5.16.7',
    '@mui/icons-material':'^5.16.7',
    '@emotion/react':     '^11.13.3',
    '@emotion/styled':    '^11.13.0',
    'react-router-dom':   '^6.26.2',
    'react-hook-form':    '^7.53.0',
    zod:                  '^3.23.8',
    '@hookform/resolvers':'^3.9.0',
  };

  if (hasDnd)          { deps['@dnd-kit/core'] = '^6.1.0'; deps['@dnd-kit/sortable'] = '^8.0.0'; deps['@dnd-kit/utilities'] = '^3.2.2'; }
  if (hasDataGrid)     { deps['@mui/x-data-grid'] = '^7.18.0'; }
  if (hasTree)         { deps['@mui/x-tree-view'] = '^7.18.0'; }
  if (hasHttp)         { deps['axios'] = '^1.7.7'; }
  if (needsRedux)      { deps['@reduxjs/toolkit'] = '^2.2.7'; deps['react-redux'] = '^9.1.2'; }
  if (needsZustand)    { deps['zustand'] = '^4.5.5'; }
  if (hasAnimations)   { deps['framer-motion'] = '^11.5.0'; }

  return JSON.stringify({
    name: projectName,
    private: true,
    version,
    type: 'module',
    scripts: {
      dev:          'vite',
      build:        'tsc -b && vite build',
      preview:      'vite preview',
      test:         'vitest',
      'test:run':   'vitest run',
      lint:         'tsc --noEmit',
    },
    dependencies: deps,
    devDependencies: {
      vite:                        '^5.4.8',
      '@vitejs/plugin-react':      '^4.3.2',
      vitest:                      '^2.1.2',
      '@testing-library/react':    '^16.0.1',
      '@testing-library/user-event':'^14.5.2',
      '@testing-library/jest-dom': '^6.5.0',
      jsdom:                       '^25.0.1',
      '@types/react':              '^18.3.11',
      '@types/react-dom':          '^18.3.1',
      typescript:                  '^5.5.4',
    },
  }, null, 2);
}

const VITE_CONFIG = `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true,
  },
});
`;

const TSCONFIG_APP = JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    useDefineForClassFields: true,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    allowImportingTsExtensions: true,
    isolatedModules: true,
    moduleDetection: 'force',
    noEmit: true,
    jsx: 'react-jsx',
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    types: ['vite/client'],
  },
  include: ['src'],
}, null, 2);

const TSCONFIG_NODE = JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    lib: ['ES2023'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    allowImportingTsExtensions: true,
    isolatedModules: true,
    moduleDetection: 'force',
    noEmit: true,
    strict: true,
  },
  include: ['vite.config.ts'],
}, null, 2);

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{TITLE}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const TEST_SETUP = `import '@testing-library/jest-dom';

// jsdom does not implement matchMedia — provide a minimal stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
`;

/** Base directories always created */
const BASE_DIRS = [
  'src/components/layout',
  'src/components/shared',
  'src/router',
  'src/theme',
  'src/config',
  'src/hooks',
  'src/utils',
  'src/types',
  'public',
];

/**
 * Derives src/pages/<name> directories from the conversion report.
 * Falls back to a minimal set if no report is available.
 */
function buildDirs(report: Record<string, unknown> | null): string[] {
  const dirs = [...BASE_DIRS];
  if (!report) return dirs;

  type CompRaw = { reactOutputFile?: string };
  const components = (report.components as CompRaw[]) ?? [];
  const pageSet = new Set<string>();

  for (const c of components) {
    const file = c.reactOutputFile ?? '';
    const m = file.match(/^src\/(pages\/[\w-]+)\//);
    if (m) pageSet.add(m[1]);
    const m2 = file.match(/^src\/(components\/[\w-]+)\//);
    if (m2) pageSet.add(m2[1]);
  }

  if (pageSet.size > 0) {
    dirs.push(...[...pageSet]);
  }

  return dirs;
}

export class ScaffoldTool implements vscode.LanguageModelTool<ScaffoldInput> {
  constructor(private readonly _workspaceRoot: string) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ScaffoldInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const reactPath    = options.input.reactOutputPath;
    const angularPath  = options.input.angularProjectPath;

    // ── Load conversion report (optional but improves output) ─────────────
    let report: Record<string, unknown> | null = null;
    const reportPath = options.input.conversionReportPath
      ?? (angularPath ? path.join(angularPath, 'ai-workflow', 'output', 'conversion-report.json') : null);
    if (reportPath && fs.existsSync(reportPath)) {
      try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { /* use defaults */ }
    }

    // ── Derive project name from Angular package.json or output folder name ──
    let projectName = path.basename(reactPath);
    if (angularPath) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(angularPath, 'package.json'), 'utf8'));
        if (pkg.name) projectName = (pkg.name as string).replace(/angular/i, 'react').replace(/-app$/, '') + '-react';
      } catch { /* use folder name */ }
    }

    // ── Create directories (derived from report) ──────────────────────────────
    const dirs = buildDirs(report);
    for (const dir of dirs) {
      if (token.isCancellationRequested) return makeResult('❌ Cancelled');
      fs.mkdirSync(path.join(reactPath, dir), { recursive: true });
    }

    // ── Read Angular version from report ──────────────────────────────────────
    let version = '0.1.0';
    if (report?.angularVersion) {
      const av = (report.angularVersion as string).replace(/[\^~>=<]/g, '');
      version = av.split('.')[0] + '.0.0';
    }

    // ── Write config files ────────────────────────────────────────────────────
    const appTitle = projectName
      .split(/[-_]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    const files: Record<string, string> = {
      'package.json':        buildPackageJson(projectName, version, report),
      'vite.config.ts':      VITE_CONFIG,
      'tsconfig.app.json':   TSCONFIG_APP,
      'tsconfig.node.json':  TSCONFIG_NODE,
      'tsconfig.json':       JSON.stringify({ files: [], references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }] }, null, 2),
      'index.html':          INDEX_HTML.replace('{{TITLE}}', appTitle),
      '.env':                'VITE_APP_VERSION=0.1.0\nVITE_API_URL=http://localhost:5173\n',
      'src/test-setup.ts':   TEST_SETUP,
    };

    for (const [file, content] of Object.entries(files)) {
      if (token.isCancellationRequested) return makeResult('❌ Cancelled');
      fs.writeFileSync(path.join(reactPath, file), content);
    }

    // ── npm install ───────────────────────────────────────────────────────────
    const installResult = await runShell('npm install', reactPath, token);
    const installOk = installResult.exitCode === 0;

    // ── Checkpoint ────────────────────────────────────────────────────────────
    if (angularPath && fs.existsSync(angularPath)) {
      writeCheckpoint(angularPath, '02-scaffold.done');
    }

    const lines: string[] = [
      `## ${installOk ? '✅' : '⚠️'} Agent 2: Scaffold Complete`,
      ``,
      `**React project created at:** \`${reactPath}\``,
      ``,
      `### Files created`,
      ...Object.keys(files).map(f => `- \`${f}\``),
      `- \`${dirs.length} src/ subdirectories\` (derived from project structure)`,
      ``,
      `### npm install`,
      installOk
        ? '✅ Dependencies installed successfully'
        : `⚠️ npm install exited with code ${installResult.exitCode}:\n\`\`\`\n${installResult.stderr.slice(0, 300)}\n\`\`\``,
      ``,
      `### Next Step`,
      `Run \`#ng2reactConvert\` to convert all Angular components to React TSX.`,
    ];

    return makeResult(lines.join('\n'));
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ScaffoldInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Scaffolding React project at ${options.input.reactOutputPath}…`,
      confirmationMessages: {
        title:   'Scaffold React Project',
        message: new vscode.MarkdownString(
          `Create a new React project at **${options.input.reactOutputPath}** and run \`npm install\`?`
        ),
      },
    };
  }
}
