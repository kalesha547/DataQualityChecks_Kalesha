# Copilot Agent Instructions — Angular → React Automated Migration

## Project Context
This is an **Angular 18 Material boilerplate** being fully converted to **React 18 + MUI v5**.
The conversion is orchestrated by a multi-agent workflow defined in `ai-workflow/`.

## Your Role as Copilot Agent
You are an autonomous migration agent. You will be invoked with a specific agent prompt
from `ai-workflow/agents/`. Read the agent prompt, execute every step listed, and produce
the exact output files specified. Do NOT stop and ask for confirmation — proceed fully.

---

## Golden Rules (never violate these)

1. **Clean Architecture**: Mirror the Angular folder structure in React:
   - `src/app/` → `src/`
   - `src/app/protected/<feature>/` → `src/pages/<feature>/`
   - `src/app/shared/` → `src/components/shared/`
   - `src/app/layout/` → `src/components/layout/`
   - `src/environments/` → `src/config/`

2. **Tech Stack — always use exactly**:
   | Angular | React Equivalent |
   |---------|-----------------|
   | Angular 18 | React 18 + TypeScript |
   | Angular CLI / Vite builder | Vite 5 |
   | Angular Material v3 | MUI v5 (@mui/material) |
   | Angular CDK BreakpointObserver | `useMediaQuery` (MUI) |
   | Angular CDK DragDrop | `@dnd-kit/core` + `@dnd-kit/sortable` |
   | Angular Router (lazy) | React Router v6 (`lazy` + `Suspense`) |
   | Reactive Forms + Validators | React Hook Form + Zod |
   | RxJS Observables | React hooks (`useState`, `useEffect`, `useContext`) |
   | Karma + Jasmine | Vitest + React Testing Library |
   | SCSS + M3 theme | MUI `ThemeProvider` + `createTheme` |
   | `localStorage` theme toggle | React Context + `localStorage` |
   | Angular MatTree + FlatTreeControl | MUI `TreeView` / `SimpleTreeView` |

3. **No class components** — only functional components with hooks.
4. **No `any` types** — full TypeScript strict mode.
5. **Lazy load every route** — use `React.lazy()` + `<Suspense>` for every page.
6. **Co-locate tests** — place `*.test.tsx` next to the component file.
7. **No barrel re-exports** unless 3+ components share the same import path.
8. **Environment config**: use `import.meta.env` (Vite), not `process.env`.

---

## Angular → React Component Conversion Pattern

### Input (Angular Standalone Component)
```typescript
@Component({
  selector: 'app-foo',
  standalone: true,
  imports: [MatButtonModule, NgIf],
  template: `<button mat-button *ngIf="show">Click</button>`
})
export class FooComponent {
  show = true;
}
```

### Output (React Functional Component)
```tsx
// src/pages/foo/FooComponent.tsx
import { Button } from '@mui/material';

export default function FooComponent() {
  const [show] = useState(true);
  return show ? <Button variant="text">Click</Button> : null;
}
```

---

## Directive / Structural Directive Mapping

| Angular | React |
|---------|-------|
| `*ngIf="expr"` | `{expr && <Component />}` or ternary |
| `*ngFor="let x of items"` | `{items.map(x => <... key={x.id} />)}` |
| `[(ngModel)]="val"` | `value={val} onChange={e => setVal(e.target.value)}` |
| `[class.active]="flag"` | `className={flag ? 'active' : ''}` or `sx` prop |
| `(click)="fn()"` | `onClick={fn}` |
| `[routerLink]="['/path']"` | `<Link to="/path">` |
| `routerLinkActive="active"` | `<NavLink className={({isActive}) => ...}>` |

---

## RxJS → React Hooks Pattern

```typescript
// Angular
isHandset$ = this.breakpointObserver
  .observe(Breakpoints.Handset)
  .pipe(map(r => r.matches), shareReplay());
```
```tsx
// React
const isHandset = useMediaQuery(theme.breakpoints.down('md'));
```

---

## File Naming Conventions
- Components: `PascalCase.tsx` (e.g., `LayoutComponent.tsx`)
- Hooks: `use<Name>.ts` (e.g., `useTheme.ts`)
- Types: `*.types.ts`
- Constants: `*.constants.ts`
- Tests: `*.test.tsx`
- Styles: co-located in component or global `src/styles/`

---

## Invocation
To run the full workflow from Copilot agent mode, open each agent file in order and use:
```
@workspace Run the agent instructions in ai-workflow/agents/01-analysis-agent.md
```
Or run the full pipeline script:
```bash
node ai-workflow/scripts/run-workflow.mjs
```
