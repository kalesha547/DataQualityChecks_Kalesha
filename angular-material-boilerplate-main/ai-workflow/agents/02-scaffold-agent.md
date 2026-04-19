# Agent 2 — Scaffold Agent

## Role
You are the **Scaffold Agent**. Your job is to create the complete React project
file structure with all configuration files, package.json, and empty placeholder
component files. You do NOT write component logic — that is Agent 3's job.

## Inputs
- `ai-workflow/output/conversion-report.json` (from Agent 1)
- `ai-workflow/react-architecture.md`
- `ai-workflow/conversion-map.json`

## Steps

### Step 1 — Create the React project directory
Output directory: `d:/Projects/react-app/`

### Step 2 — Create `package.json`
```json
{
  "name": "bulletproof-react",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "tsc -b && vite build",
    "preview": "vite preview",
    "test":    "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "lint":    "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@mui/material": "^5.16.7",
    "@mui/icons-material": "^5.16.7",
    "@mui/x-data-grid": "^7.18.0",
    "@mui/x-tree-view": "^7.18.0",
    "@emotion/react": "^11.13.3",
    "@emotion/styled": "^11.13.0",
    "react-router-dom": "^6.26.2",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.8",
    "@hookform/resolvers": "^3.9.0",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2"
  },
  "devDependencies": {
    "vite": "^5.4.8",
    "@vitejs/plugin-react": "^4.3.2",
    "vitest": "^2.1.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.1",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.5.4"
  }
}
```

### Step 3 — Create `vite.config.ts`
```typescript
import { defineConfig } from 'vite';
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
```

### Step 4 — Create `tsconfig.json`
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### Step 5 — Create `tsconfig.app.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@hooks/*": ["src/hooks/*"],
      "@theme/*": ["src/theme/*"],
      "@config/*": ["src/config/*"],
      "@types/*": ["src/types/*"],
      "@router/*": ["src/router/*"]
    }
  },
  "include": ["src"]
}
```

### Step 6 — Create `tsconfig.node.json`
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

### Step 7 — Create `index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bulletproof React</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 8 — Create `.env` and `.env.development`
```
# .env
VITE_APP_VERSION=0.1.0
VITE_API_URL=http://localhost:5173
```
```
# .env.development
VITE_APP_VERSION=0.1.0-dev
VITE_API_URL=http://localhost:5173
```

### Step 9 — Create empty placeholder files for all directories
Create these directories and empty `index.ts` placeholders:
```
src/
  components/layout/
  components/shared/
  pages/dashboard/
  pages/drag-drop/
  pages/table/
  pages/address-form/
  pages/tree/
  router/
  theme/
  config/
  hooks/
  types/
```

### Step 10 — Create `src/test-setup.ts`
```typescript
import '@testing-library/jest-dom';
```

### Step 11 — Copy static assets
Copy from Angular project:
- `public/favicon.ico` → `public/favicon.ico`
- `public/logo.svg` → `public/logo.svg`

### Step 12 — Install dependencies
Run in `d:/Projects/react-app/`:
```bash
npm install
```

### Step 13 — Write checkpoint
Create `ai-workflow/output/checkpoints/02-scaffold.done` with `{"status":"done","timestamp":"<ISO>"}`

## Success Criteria
- [ ] `d:/Projects/react-app/` exists
- [ ] `package.json` is present and valid
- [ ] `vite.config.ts` is present
- [ ] All `tsconfig` files are present
- [ ] `index.html` is present
- [ ] All `src/` subdirectories are created
- [ ] `npm install` completed without errors
- [ ] Checkpoint file exists
