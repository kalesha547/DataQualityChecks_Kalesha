# Agentic AI Workflow — Angular → React Full Conversion

## Overview
This workflow converts the Angular 18 Material boilerplate to a React 18 + MUI v5 application
using 8 specialized AI agents executed in sequence. Each agent has a single responsibility,
accepts well-defined inputs, and produces verifiable outputs.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (run-workflow.mjs)                  │
└──────────┬──────────────────────────────────────────────────────────┘
           │
    ┌──────▼──────┐
    │  Agent 1    │  ANALYSIS       Read Angular source → emit conversion-report.json
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 2    │  SCAFFOLD       Create Vite+React project structure + install deps
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 3    │  COMPONENTS     Convert all 8 Angular components → React (.tsx)
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 4    │  ROUTER         Convert app.routes.ts → React Router v6 lazy routes
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 5    │  THEME          Convert M3 SCSS theme → MUI ThemeProvider + dark mode
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 6    │  FORMS          Convert Address Form (ReactiveFormsModule → RHF+Zod)
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 7    │  TESTS          Convert Karma/Jasmine specs → Vitest + RTL
    └──────┬──────┘
    ┌──────▼──────┐
    │  Agent 8    │  VALIDATION     TypeScript check + lint + build + test run
    └─────────────┘
```

---

## Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- Git
- Copilot agent mode enabled in VS Code (or GitHub Copilot Workspace)

---

## How to Run

### Option A — Copilot Agent Mode (Recommended)
Open VS Code with GitHub Copilot enabled. In the Copilot Chat panel, switch to **Agent mode**
and run each agent in sequence:

```
Run @workspace using the instructions in ai-workflow/agents/01-analysis-agent.md
```
Wait for the agent to finish, then proceed to the next agent.

### Option B — Automated Script
```bash
node ai-workflow/scripts/run-workflow.mjs
```
This script invokes each agent prompt via the Claude API sequentially,
passing the output of each agent as context to the next.

### Option C — Manual Step-by-Step
Open each agent `.md` file and follow the instructions manually.

---

## Agent Responsibilities

| # | Agent File | Input | Output |
|---|-----------|-------|--------|
| 1 | [01-analysis-agent.md](agents/01-analysis-agent.md) | Angular source files | `ai-workflow/output/conversion-report.json` |
| 2 | [02-scaffold-agent.md](agents/02-scaffold-agent.md) | `conversion-report.json` | React project at `../react-app/` |
| 3 | [03-component-converter-agent.md](agents/03-component-converter-agent.md) | Angular components + scaffold | All `.tsx` component files |
| 4 | [04-router-agent.md](agents/04-router-agent.md) | `app.routes.ts` + components | `src/router/index.tsx` |
| 5 | [05-theme-agent.md](agents/05-theme-agent.md) | `m3-theme.scss` + styles | `src/theme/` directory |
| 6 | [06-form-agent.md](agents/06-form-agent.md) | `address-form.component.*` | `src/pages/address-form/` |
| 7 | [07-test-agent.md](agents/07-test-agent.md) | `*.spec.ts` files | `*.test.tsx` files |
| 8 | [08-validation-agent.md](agents/08-validation-agent.md) | Entire React project | Build + test pass report |

---

## Output Structure
After all agents complete, the React project will exist at:
```
../react-app/           ← new React project (sibling to Angular project)
├── src/
│   ├── components/
│   │   ├── layout/     ← LayoutComponent
│   │   └── shared/     ← ThemeToggle
│   ├── pages/
│   │   ├── dashboard/
│   │   ├── drag-drop/
│   │   ├── table/
│   │   ├── address-form/
│   │   └── tree/
│   ├── router/         ← React Router config
│   ├── theme/          ← MUI theme
│   ├── config/         ← env config (replaces environments/)
│   ├── hooks/          ← custom hooks
│   └── types/          ← shared TypeScript types
├── ai-workflow/output/ ← agent reports and logs
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Conversion Reference
See [conversion-map.json](conversion-map.json) for the complete Angular → React API mapping.
See [react-architecture.md](react-architecture.md) for the target architecture design.

---

## Checkpoints
Each agent writes a checkpoint file to `ai-workflow/output/checkpoints/`:
- `01-analysis.done`
- `02-scaffold.done`
- `03-components.done`
- `04-router.done`
- `05-theme.done`
- `06-forms.done`
- `07-tests.done`
- `08-validation.done`

The orchestrator script checks for these files before running each agent,
allowing the workflow to resume from the last successful checkpoint.
