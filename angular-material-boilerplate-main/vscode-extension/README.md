# Angular → React Migration Agent

A VS Code extension that adds **6 Copilot Language Model Tools** for fully automated Angular-to-React migration. Works in **GitHub Copilot agent mode** (`@workspace`).

## Tools

| Tool reference | What it does |
|---|---|
| `#ng2reactStatus` | Check which agents have completed |
| `#ng2reactAnalyze` | Agent 1 — scan Angular project, produce conversion report |
| `#ng2reactScaffold` | Agent 2 — create React + Vite project, npm install |
| `#ng2reactConvert` | Agents 3–7 — convert all components, router, theme, forms, tests |
| `#ng2reactValidate` | Agent 8 — TypeScript + Vitest + build validation |
| `#ng2reactPipeline` | Run the entire pipeline end-to-end (resumes from last checkpoint) |

## Quick Start

1. Install the extension (`.vsix`) via **Extensions → Install from VSIX…**
2. Open the Angular project folder in VS Code
3. Open Copilot Chat → switch to **Agent mode**
4. Type:

```
Check the migration status #ng2reactStatus
```

Then run the full pipeline:
```
Run the Angular to React migration #ng2reactPipeline angularProjectPath="d:/Projects/angular-material-boilerplate-main" reactOutputPath="d:/Projects/react-app"
```

## Tech Stack (Angular → React)

| Angular | React |
|---------|-------|
| Angular 18 + TypeScript | React 18 + TypeScript |
| Angular Material v3 | MUI v5 |
| Angular CDK BreakpointObserver | `useMediaQuery` |
| Angular CDK DragDrop | `@dnd-kit` |
| Angular Router (lazy) | React Router v6 + `React.lazy` |
| Reactive Forms + Validators | React Hook Form + Zod |
| Karma + Jasmine | Vitest + React Testing Library |

## Installation (Development)

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## Package as VSIX

```bash
npm run package
# Produces ng2react-agent-1.0.0.vsix
```
