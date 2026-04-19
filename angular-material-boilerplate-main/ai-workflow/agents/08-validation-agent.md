# Agent 8 — Validation Agent

## Role
You are the **Validation Agent**. Your job is to verify the entire React project
compiles, passes all tests, and matches the Angular app's feature parity.
You are the final quality gate before the migration is declared complete.

## Inputs
- All files in `d:/Projects/react-app/src/`
- All checkpoint files in `ai-workflow/output/checkpoints/`

## Steps

### Step 1 — Verify all prior checkpoints exist
Check that these files exist (abort with error if any are missing):
```
ai-workflow/output/checkpoints/01-analysis.done
ai-workflow/output/checkpoints/02-scaffold.done
ai-workflow/output/checkpoints/03-components.done
ai-workflow/output/checkpoints/04-router.done
ai-workflow/output/checkpoints/05-theme.done
ai-workflow/output/checkpoints/06-forms.done
ai-workflow/output/checkpoints/07-tests.done
```
If any checkpoint is missing, output: `BLOCKED: Agent <N> has not completed. Run agents in order.`

### Step 2 — Verify all required files exist
Check that every file in this list exists in `d:/Projects/react-app/`:

**Config files:**
- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `index.html`
- `.env`

**Source files:**
- `src/main.tsx`
- `src/App.tsx`
- `src/App.test.tsx`
- `src/test-setup.ts`
- `src/config/env.ts`
- `src/types/index.ts`
- `src/hooks/useThemeMode.ts`
- `src/hooks/useBreakpoint.ts`
- `src/theme/theme.ts`
- `src/theme/ThemeContext.tsx`
- `src/theme/GlobalStyles.tsx`
- `src/router/index.tsx`
- `src/router/nav-config.ts`
- `src/components/layout/LayoutComponent.tsx`
- `src/components/layout/LayoutComponent.test.tsx`
- `src/components/shared/ThemeToggle.tsx`
- `src/components/shared/ThemeToggle.test.tsx`
- `src/pages/dashboard/DashboardComponent.tsx`
- `src/pages/dashboard/DashboardComponent.test.tsx`
- `src/pages/drag-drop/DragDropComponent.tsx`
- `src/pages/drag-drop/DragDropComponent.test.tsx`
- `src/pages/table/TableComponent.tsx`
- `src/pages/table/table.types.ts`
- `src/pages/table/TableComponent.test.tsx`
- `src/pages/address-form/AddressFormComponent.tsx`
- `src/pages/address-form/addressForm.schema.ts`
- `src/pages/address-form/AddressFormComponent.test.tsx`
- `src/pages/tree/TreeComponent.tsx`
- `src/pages/tree/tree.data.ts`
- `src/pages/tree/TreeComponent.test.tsx`

For each missing file, output: `MISSING: <filepath>`

### Step 3 — Run TypeScript check
```bash
cd d:/Projects/react-app && npx tsc --noEmit
```
- If errors: list each error with file + line number
- Fix TypeScript errors by editing the relevant files
- Re-run until `tsc` exits with code 0

Common errors to fix:
- `any` types → replace with proper TypeScript types
- Missing imports → add the import
- Property does not exist → check MUI v5 API
- `Object possibly undefined` → add optional chaining or null check
- Module not found → verify package is installed in `package.json`

### Step 4 — Run tests
```bash
cd d:/Projects/react-app && npm test -- --run
```
- If tests fail: analyze the error, fix the component or test file
- Re-run until all tests pass with exit code 0
- Target: 100% of tests passing

Common test failures to fix:
- "Unable to find role": check the MUI component renders the correct ARIA role
- "Context not found": wrap component with required providers in test
- "Router not found": wrap with `MemoryRouter` or `RouterProvider` in test
- Icon test failure: use `data-testid` attributes or different query strategy

### Step 5 — Run build
```bash
cd d:/Projects/react-app && npm run build
```
- If build fails: fix the error and re-run
- Build should succeed with no errors

### Step 6 — Feature Parity Checklist
Verify each Angular feature has a React equivalent:

```
ROUTING
[ ] / redirects to /dashboard
[ ] /dashboard loads DashboardComponent
[ ] /drag-drop loads DragDropComponent
[ ] /table loads TableComponent
[ ] /address-form loads AddressFormComponent
[ ] /tree loads TreeComponent
[ ] /** redirects to /dashboard
[ ] Active route is highlighted in sidebar

LAYOUT
[ ] Sidebar opens on desktop by default
[ ] Sidebar collapses to hamburger on mobile (<md breakpoint)
[ ] AppBar displays at top
[ ] User avatar menu in AppBar
[ ] ThemeToggle button in AppBar
[ ] App logo/title in AppBar

THEME
[ ] Light mode is default (or follows system preference)
[ ] Dark mode toggles correctly
[ ] Theme preference persists on page reload (localStorage)
[ ] MUI CssBaseline applied

DASHBOARD
[ ] 4 cards rendered in a grid
[ ] Cards have title, subtitle, content
[ ] Grid is responsive (1 col mobile, 2 col desktop)

DRAG & DROP
[ ] Two lists: "To do" and "Done"
[ ] Items are draggable within each list
[ ] Items can be transferred between lists
[ ] Visual drag feedback

TABLE
[ ] Table has Name, Progress, Fruit, No. columns
[ ] Sorting works on all columns
[ ] Pagination works (10 rows per page default)

ADDRESS FORM
[ ] All 9 fields present
[ ] Required validation on firstName, lastName, address, city, state, postalCode, shipping
[ ] Error messages appear after field blur
[ ] Submit disabled when invalid
[ ] All 50 US states in dropdown
[ ] 3 shipping radio options

TREE
[ ] Hierarchical tree renders
[ ] Nodes expand/collapse on click
[ ] Nested items visible after expansion
```

### Step 7 — Write final report
Create `ai-workflow/output/validation-report.json`:
```json
{
  "timestamp": "<ISO>",
  "status": "PASS" | "FAIL",
  "typescriptCheck": { "status": "PASS" | "FAIL", "errors": [] },
  "tests": { "status": "PASS" | "FAIL", "passed": 0, "failed": 0, "total": 0 },
  "build": { "status": "PASS" | "FAIL", "bundleSize": "" },
  "featureParity": { "total": 34, "passed": 0, "failed": [] },
  "missingFiles": [],
  "notes": ""
}
```

### Step 8 — Write checkpoint
Create `ai-workflow/output/checkpoints/08-validation.done`

## Success Criteria
- [ ] TypeScript: `tsc --noEmit` exits with code 0
- [ ] Tests: all pass (`npm test -- --run` exits with code 0)
- [ ] Build: `npm run build` exits with code 0
- [ ] All 30 required files exist
- [ ] All 7 prior checkpoints exist
- [ ] Validation report written to `ai-workflow/output/validation-report.json`
- [ ] Feature parity checklist: minimum 90% checked

## If Validation Fails
For each failure, the agent must:
1. Identify the root cause (not just the symptom)
2. Fix the relevant source file
3. Re-run the failing check
4. Do NOT mark the checkpoint as done until all checks pass

The workflow is NOT complete until this agent produces a `"status": "PASS"` report.
