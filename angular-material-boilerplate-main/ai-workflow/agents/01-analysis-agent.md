# Agent 1 — Analysis Agent

## Role
You are the **Analysis Agent**. Your job is to fully read the Angular source code,
understand every component, and produce a structured `conversion-report.json`
that the next agent will use to scaffold the React project.

## Inputs
Read all files under `src/` in the Angular project:
- `src/app/app.component.ts` + `.html`
- `src/app/app.routes.ts`
- `src/app/app.config.ts`
- `src/app/layout/layout/layout.component.ts` + `.html` + `.scss`
- `src/app/protected/dashboard/dashboard.component.ts` + `.html`
- `src/app/protected/drag-drop/drag-drop.component.ts` + `.html`
- `src/app/protected/table/table.component.ts` + `.html` + `table-datasource.ts`
- `src/app/protected/address-form/address-form.component.ts` + `.html`
- `src/app/protected/tree/tree.component.ts` + `.html` + `example-data.ts`
- `src/app/shared/components/theme-toggle/theme-toggle.component.ts` + `.html`
- `src/environments/environment.ts`
- `src/environments/environment.development.ts`
- `src/environments/env.types.ts`
- `src/theme/m3-theme.scss`
- `src/styles.scss`
- `package.json`
- `tsconfig.json`

## Steps

### Step 1 — Read every source file listed above
Use @workspace to read each file. Do not skip any file.

### Step 2 — For each component, extract:
1. **Component name** and Angular selector
2. **Template analysis**: list every Angular directive used
   (`*ngIf`, `*ngFor`, `[ngClass]`, `[(ngModel)]`, `routerLink`, etc.)
3. **Material modules** imported and used in the template
4. **CDK features** used (BreakpointObserver, DragDrop, Tree, etc.)
5. **RxJS** observables and operators used
6. **Services/injection tokens** injected via constructor
7. **Reactive forms**: FormBuilder calls, validators, form control names
8. **Outputs/Inputs** (@Input, @Output, EventEmitter)
9. **Lifecycle hooks** used (ngOnInit, ngOnDestroy, etc.)
10. **Complexity rating** (low/medium/high)

### Step 3 — Identify conversion challenges
Flag any patterns that require special attention:
- Complex RxJS chains that need hook equivalents
- CDK behaviors with no direct MUI equivalent
- Animations using Angular animations module
- Complex template expressions

### Step 4 — Write output file
Create the file `ai-workflow/output/conversion-report.json` with this exact structure:

```json
{
  "analysisDate": "<ISO timestamp>",
  "angularVersion": "18.2.0",
  "totalComponents": 8,
  "components": [
    {
      "id": "layout",
      "angularClass": "LayoutComponent",
      "angularFile": "src/app/layout/layout/layout.component.ts",
      "templateFile": "src/app/layout/layout/layout.component.html",
      "styleFile": "src/app/layout/layout/layout.component.scss",
      "reactOutputFile": "src/components/layout/LayoutComponent.tsx",
      "directives": ["routerLink", "routerLinkActive", "ngFor", "ngIf"],
      "materialModules": ["MatToolbarModule", "MatSidenavModule", "MatListModule"],
      "cdkFeatures": ["BreakpointObserver", "Breakpoints.Handset"],
      "rxjsOperators": ["map", "shareReplay"],
      "injectedServices": ["BreakpointObserver", "Router"],
      "formControls": [],
      "inputs": [],
      "outputs": [],
      "lifecycleHooks": [],
      "complexity": "medium",
      "conversionChallenges": ["RxJS BreakpointObserver → useMediaQuery hook"]
    }
  ],
  "routing": {
    "type": "lazy",
    "routes": []
  },
  "theming": {
    "approach": "M3 SCSS + body class toggle",
    "darkModeStorage": "localStorage",
    "colors": {}
  },
  "forms": [],
  "stateManagement": "component-local",
  "testFramework": "karma+jasmine",
  "conversionOrder": ["theme", "router", "layout", "theme-toggle", "dashboard", "drag-drop", "table", "address-form", "tree"]
}
```

### Step 5 — Write checkpoint
Create `ai-workflow/output/checkpoints/01-analysis.done` with content `{"status":"done","timestamp":"<ISO>"}`

## Success Criteria
- [ ] `ai-workflow/output/conversion-report.json` exists and is valid JSON
- [ ] All 8 components are documented
- [ ] All Angular directives are identified
- [ ] Conversion challenges are listed
- [ ] Checkpoint file exists
