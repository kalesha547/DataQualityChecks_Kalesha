import * as vscode from 'vscode';
import * as fs     from 'fs';
import * as path   from 'path';
import {
  makeResult,
  writeCheckpoint,
  outputDir,
  findAngularComponents,
  getPackageVersion,
} from '../utils/workflow';

interface AnalyzeInput {
  angularProjectPath: string;
  outputPath?:        string;
}

// ── Per-component analysis ─────────────────────────────────────────────────
interface ComponentAnalysis {
  id:                   string;
  angularClass:         string;
  angularFile:          string;
  reactOutputFile:      string;
  directives:           string[];
  materialModules:      string[];
  cdkFeatures:          string[];
  rxjsOperators:        string[];
  formControls:         string[];
  hasFormArray:         boolean;
  hasNestedFormGroup:   boolean;
  hasAsyncValidator:    boolean;
  hasCrossFieldValidator: boolean;
  complexity:           'low' | 'medium' | 'high';
  conversionChallenges: string[];
}

// ── Project-level pattern inventory ────────────────────────────────────────
interface ProjectPatterns {
  services:          ServiceInfo[];
  httpPatterns:      HttpInfo[];
  pipes:             PipeInfo[];
  directives:        DirectiveInfo[];
  guards:            GuardInfo[];
  resolvers:         ResolverInfo[];
  stateManagement:   StateInfo;
  animations:        AnimationInfo[];
  injectionTokens:   string[];
  formArrays:        string[];
}

interface ServiceInfo {
  className:  string;
  file:       string;
  providedIn: string;
  hasBehaviorSubject: boolean;
  hasHttpClient: boolean;
  reactTarget: string;  // 'zustand' | 'hook' | 'context' | 'axios-api'
}

interface HttpInfo {
  file:       string;
  type:       'service' | 'interceptor';
  endpoints:  string[];
  reactTarget: string;
}

interface PipeInfo {
  className: string;
  file:      string;
  pipeName:  string;
  isBuiltin: boolean;
  reactTarget: string;
}

interface DirectiveInfo {
  className:   string;
  file:        string;
  selector:    string;
  type:        'structural' | 'attribute' | 'validator' | 'event';
  reactTarget: string;
}

interface GuardInfo {
  className:   string;
  file:        string;
  guardType:   'CanActivate' | 'CanDeactivate' | 'CanLoad' | 'CanMatch' | 'Resolve';
  reactTarget: string;
}

interface ResolverInfo {
  className: string;
  file:      string;
  reactTarget: string;
}

interface StateInfo {
  type:     'ngrx' | 'akita' | 'ngxs' | 'behaviorsubject' | 'component-local';
  package:  string | null;
  slices:   string[];
  reactLib: string;
}

interface AnimationInfo {
  file:      string;
  triggers:  string[];
}

// ── Angular directive / import → React equivalents ─────────────────────────
const DIRECTIVE_MAP: Record<string, string> = {
  'RouterOutlet':       'Outlet (react-router-dom)',
  'RouterLink':         'NavLink / Link (react-router-dom)',
  'RouterLinkActive':   'NavLink className={({isActive}) => ...}',
  'AsyncPipe':          'useState + useEffect',
  'NgOptimizedImage':   '<img> with src prop',
  '*ngIf':              '{condition && <Component />}',
  '*ngFor':             '{items.map(item => <Component key={item.id} />)}',
  '[(ngModel)]':        'useState + onChange handler',
  'ReactiveFormsModule':'useForm() from react-hook-form',
  'BreakpointObserver': 'useMediaQuery() from @mui/material',
  'CdkDrag':            'useSortable() from @dnd-kit/sortable',
  'CdkDropList':        'SortableContext from @dnd-kit/sortable',
  'MatTreeModule':      'SimpleTreeView from @mui/x-tree-view',
  'MatTableModule':     'DataGrid from @mui/x-data-grid',
};

// ── BUILT-IN ANGULAR PIPE NAMES ─────────────────────────────────────────────
const BUILTIN_PIPES = new Set([
  'date','currency','number','percent','uppercase','lowercase','titlecase',
  'slice','json','async','keyvalue','i18nPlural','i18nSelect',
]);

// ── Detection helpers ───────────────────────────────────────────────────────

function detectDirectivesInComponent(content: string): string[] {
  return Object.keys(DIRECTIVE_MAP).filter(d => content.includes(d));
}

function detectMaterialModules(content: string): string[] {
  const matPattern = /Mat\w+Module|MatMenu\w*|MatIcon/g;
  return [...new Set(content.match(matPattern) ?? [])];
}

function detectCDKFeatures(content: string): string[] {
  const cdkPattern = /Breakpoint\w+|Cdk\w+|FlatTreeControl|MatTreeFlattener|MatTreeFlatDataSource|DataSource/g;
  return [...new Set(content.match(cdkPattern) ?? [])];
}

function detectRxJS(content: string): string[] {
  const rxPattern = /\b(map|filter|tap|switchMap|mergeMap|exhaustMap|concatMap|shareReplay|combineLatest|forkJoin|withLatestFrom|debounceTime|distinctUntilChanged|takeUntil|Subject|BehaviorSubject|ReplaySubject|Observable|of\b|from\b|timer\b|interval\b)\b/g;
  return [...new Set(content.match(rxPattern) ?? [])];
}

function detectFormControls(content: string): string[] {
  const fcPattern = /FormControl\(['"](\w+)['"]/g;
  const fbPattern = /\s+(\w+):\s*\[?null/g;
  const controls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = fcPattern.exec(content)) !== null) controls.push(m[1]);
  while ((m = fbPattern.exec(content)) !== null) controls.push(m[1]);
  return [...new Set(controls)];
}

function detectFormArray(content: string): boolean {
  return /FormArray|fb\.array\(|this\.fb\.array\(|new FormArray/.test(content);
}

function detectNestedFormGroup(content: string): boolean {
  // fb.group inside fb.group
  return /fb\.group\([^)]*fb\.group|FormBuilder.*group.*group/s.test(content);
}

function detectAsyncValidator(content: string): boolean {
  return /AsyncValidatorFn|asyncValidators|asyncValidator/.test(content);
}

function detectCrossFieldValidator(content: string): boolean {
  return /validators:\s*\[|AbstractControl.*group|group.*AbstractControl/.test(content);
}

function calcComplexity(
  d: string[], cdk: string[], rxjs: string[], fc: string[],
  hasFormArray: boolean, hasGuard: boolean
): 'low' | 'medium' | 'high' {
  let score = d.length + cdk.length * 2 + rxjs.length + fc.length * 2;
  if (hasFormArray) score += 3;
  if (hasGuard) score += 2;
  if (score >= 12) return 'high';
  if (score >= 4)  return 'medium';
  return 'low';
}

// ── Project-level scanners ──────────────────────────────────────────────────

function scanServices(srcRoot: string): ServiceInfo[] {
  const services: ServiceInfo[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.service.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (!content.includes('@Injectable')) continue;

      const className = (content.match(/export class (\w+Service)/) ?? [])[1] ?? entry.name;
      const providedInMatch = content.match(/providedIn:\s*['"](\w+)['"]/);
      const hasBehaviorSubject = /BehaviorSubject/.test(content);
      const hasHttpClient = /HttpClient/.test(content);

      let reactTarget = 'hook';
      if (hasHttpClient) reactTarget = 'axios-api';
      else if (hasBehaviorSubject) reactTarget = 'zustand';
      else if (/inject\(|constructor.*Service/.test(content)) reactTarget = 'context';

      services.push({
        className,
        file:  path.relative(srcRoot, full).replace(/\\/g, '/'),
        providedIn: providedInMatch?.[1] ?? 'root',
        hasBehaviorSubject,
        hasHttpClient,
        reactTarget,
      });
    }
  };
  walk(srcRoot);
  return services;
}

function scanHttpPatterns(srcRoot: string): HttpInfo[] {
  const results: HttpInfo[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      const isInterceptor = /HttpInterceptor|intercept\(/.test(content);
      const hasHttp = /HttpClient|this\.http\./.test(content);
      if (!hasHttp && !isInterceptor) continue;

      const endpoints = [...content.matchAll(/this\.http\.\w+\(['"`]([^'"`]+)['"`]/g)]
        .map(m => m[1]);

      results.push({
        file: path.relative(srcRoot, full).replace(/\\/g, '/'),
        type: isInterceptor ? 'interceptor' : 'service',
        endpoints: [...new Set(endpoints)],
        reactTarget: isInterceptor ? 'axios-interceptor' : 'axios-api-module',
      });
    }
  };
  walk(srcRoot);
  return results;
}

function scanPipes(srcRoot: string): PipeInfo[] {
  const pipes: PipeInfo[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.pipe.ts') && !entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (!content.includes('@Pipe')) continue;

      const classMatch = content.match(/export class (\w+Pipe)/);
      const nameMatch  = content.match(/name:\s*['"](\w+)['"]/);
      if (!classMatch) continue;

      const pipeName = nameMatch?.[1] ?? entry.name.replace('.pipe.ts', '');
      const isBuiltin = BUILTIN_PIPES.has(pipeName);

      pipes.push({
        className: classMatch[1],
        file:      path.relative(srcRoot, full).replace(/\\/g, '/'),
        pipeName,
        isBuiltin,
        reactTarget: isBuiltin
          ? `formatters.ts utility`
          : `src/utils/${pipeName}.ts utility function`,
      });
    }
  };
  walk(srcRoot);
  return pipes;
}

function scanDirectives(srcRoot: string): DirectiveInfo[] {
  const directives: DirectiveInfo[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.directive.ts') && !entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (!content.includes('@Directive')) continue;

      const classMatch = content.match(/export class (\w+Directive)/);
      const selectorMatch = content.match(/selector:\s*['"]\[?(\w+)\]?['"]/);
      if (!classMatch) continue;

      const hasTemplateRef     = /TemplateRef|ViewContainerRef/.test(content);
      const hasHostListener    = /@HostListener/.test(content);
      const hasValidator       = /NG_VALIDATORS|Validator\b/.test(content);
      const hasHostBinding     = /@HostBinding/.test(content);

      let type: DirectiveInfo['type'] = 'attribute';
      if (hasTemplateRef) type = 'structural';
      else if (hasValidator) type = 'validator';
      else if (hasHostListener) type = 'event';

      let reactTarget = 'inline sx prop or styled component';
      if (type === 'structural')  reactTarget = 'JSX conditional or wrapper component';
      if (type === 'event')       reactTarget = `src/hooks/use${classMatch[1].replace('Directive','')}.ts`;
      if (type === 'validator')   reactTarget = 'Zod .refine() schema rule';
      if (hasHostBinding && !hasHostListener) reactTarget = 'styled component or sx prop';

      directives.push({
        className:   classMatch[1],
        file:        path.relative(srcRoot, full).replace(/\\/g, '/'),
        selector:    selectorMatch?.[1] ?? '',
        type,
        reactTarget,
      });
    }
  };
  walk(srcRoot);
  return directives;
}

function scanGuards(srcRoot: string): { guards: GuardInfo[]; resolvers: ResolverInfo[] } {
  const guards: GuardInfo[]     = [];
  const resolvers: ResolverInfo[] = [];

  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      const file    = path.relative(srcRoot, full).replace(/\\/g, '/');

      if (/CanActivate\b|CanActivateFn/.test(content)) {
        const cn = (content.match(/export (?:class|const) (\w+)/) ?? [])[1] ?? entry.name;
        guards.push({ className: cn, file, guardType: 'CanActivate', reactTarget: '<ProtectedRoute> wrapper component' });
      }
      if (/CanDeactivate\b|CanDeactivateFn/.test(content)) {
        const cn = (content.match(/export (?:class|const) (\w+)/) ?? [])[1] ?? entry.name;
        guards.push({ className: cn, file, guardType: 'CanDeactivate', reactTarget: 'useBlocker hook (React Router v6.7+)' });
      }
      if (/CanLoad\b|CanMatch\b|CanLoadFn|CanMatchFn/.test(content)) {
        const cn = (content.match(/export (?:class|const) (\w+)/) ?? [])[1] ?? entry.name;
        guards.push({ className: cn, file, guardType: 'CanLoad', reactTarget: 'React.lazy + loader function' });
      }
      if (/implements Resolve\b|Resolve</.test(content)) {
        const cn = (content.match(/export class (\w+Resolver)/) ?? [])[1] ?? entry.name;
        resolvers.push({ className: cn, file, reactTarget: 'loader() function in React Router route config' });
      }
    }
  };
  walk(srcRoot);
  return { guards, resolvers };
}

function detectStateManagement(projectRoot: string, srcRoot: string): StateInfo {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkgContent = fs.existsSync(pkgPath) ? fs.readFileSync(pkgPath, 'utf8') : '{}';

  if (pkgContent.includes('@ngrx/store')) {
    // Find NgRx slice names from action files
    const slices: string[] = [];
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!entry.name.endsWith('.ts')) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (/createReducer|createSlice|createAction/.test(content)) {
          const m = content.match(/\[['"](\w+)\s+\w+['"]\]/);
          if (m) slices.push(m[1]);
        }
      }
    };
    walk(srcRoot);
    return { type: 'ngrx', package: '@ngrx/store', slices: [...new Set(slices)], reactLib: '@reduxjs/toolkit + react-redux' };
  }

  if (pkgContent.includes('@datorama/akita')) {
    return { type: 'akita', package: '@datorama/akita', slices: [], reactLib: 'zustand (normalized)' };
  }

  if (pkgContent.includes('@ngxs/store')) {
    return { type: 'ngxs', package: '@ngxs/store', slices: [], reactLib: '@reduxjs/toolkit' };
  }

  // Check for BehaviorSubject in services
  let hasBs = false;
  const walkSrc = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walkSrc(full); continue; }
      if (!entry.name.endsWith('.service.ts')) continue;
      if (fs.readFileSync(full, 'utf8').includes('BehaviorSubject')) hasBs = true;
    }
  };
  walkSrc(srcRoot);

  if (hasBs) {
    return { type: 'behaviorsubject', package: null, slices: [], reactLib: 'zustand' };
  }

  return { type: 'component-local', package: null, slices: [], reactLib: 'useState / useReducer' };
}

function scanAnimations(srcRoot: string): AnimationInfo[] {
  const results: AnimationInfo[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (!/@angular\/animations|trigger\(|animate\(/.test(content)) continue;

      const triggers = [...content.matchAll(/trigger\(['"](\w+)['"]/g)].map(m => m[1]);
      if (triggers.length > 0) {
        results.push({
          file:     path.relative(srcRoot, full).replace(/\\/g, '/'),
          triggers,
        });
      }
    }
  };
  walk(srcRoot);
  return results;
}

function scanInjectionTokens(srcRoot: string): string[] {
  const tokens: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      const matches = [...content.matchAll(/new InjectionToken\(['"]([^'"]+)['"]/g)].map(m => m[1]);
      tokens.push(...matches);
    }
  };
  walk(srcRoot);
  return [...new Set(tokens)];
}

function scanFormArrays(srcRoot: string): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;

      const content = fs.readFileSync(full, 'utf8');
      if (/FormArray|fb\.array\(/.test(content)) {
        results.push(path.relative(srcRoot, full).replace(/\\/g, '/'));
      }
    }
  };
  walk(srcRoot);
  return results;
}

// ── Generic Angular path → React path mapper ────────────────────────────────
/**
 * Converts any Angular component file path to a React output path.
 * Works for any project structure — not tied to this specific boilerplate.
 *
 * Rules (applied in order):
 *   app.component.ts → App.tsx (root component)
 *   app/shared/**   → components/shared/
 *   app/layout/**   → components/layout/
 *   app/core/**     → components/core/
 *   app/features/** → pages/
 *   app/pages/**    → pages/
 *   app/protected/** → pages/
 *   app/<name>/<name>.component.ts → pages/<name>/
 *   everything else → components/<relative-path>
 */
function deriveReactPath(relativePath: string): string {
  // Normalize path separators
  const p = relativePath.replace(/\\/g, '/');

  // Root app component
  if (/^app\/app\.component\.ts$/.test(p)) return 'App.tsx';

  // Strip leading 'app/'
  const withoutApp = p.replace(/^app\//, '');

  // Shared/layout/core utility components
  if (withoutApp.startsWith('shared/'))    return withoutApp.replace('shared/', 'components/shared/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('layout/'))    return withoutApp.replace('layout/', 'components/layout/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('core/'))      return withoutApp.replace('core/', 'components/core/').replace('.component.ts', '.tsx');

  // Feature/page areas
  if (withoutApp.startsWith('features/'))  return withoutApp.replace('features/', 'pages/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('pages/'))     return withoutApp.replace('pages/', 'pages/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('protected/')) return withoutApp.replace('protected/', 'pages/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('views/'))     return withoutApp.replace('views/', 'pages/').replace('.component.ts', '.tsx');
  if (withoutApp.startsWith('modules/'))   return withoutApp.replace('modules/', 'pages/').replace('.component.ts', '.tsx');

  // Collapse double-segment paths like app/dashboard/dashboard.component.ts → pages/dashboard/
  const doubled = withoutApp.match(/^(\w[\w-]*)\/\1\.component\.ts$/);
  if (doubled) return `pages/${doubled[1]}/${toPascalCase(doubled[1])}.tsx`;

  // Fallback: put in components/
  return `components/${withoutApp.replace('.component.ts', '.tsx')}`;
}

function toPascalCase(kebab: string): string {
  return kebab.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

// ── Per-component analysis ─────────────────────────────────────────────────

function analyzeComponent(filePath: string, angularSrcRoot: string): ComponentAnalysis {
  const content      = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(angularSrcRoot, filePath).replace(/\\/g, '/');
  const className    = (content.match(/export class (\w+Component)/) ?? [])[1] ?? path.basename(filePath, '.ts');

  // Derive React output path — generic heuristic works for any Angular project structure
  const reactPath = deriveReactPath(relativePath);

  const directives    = detectDirectivesInComponent(content);
  const materialMod   = detectMaterialModules(content);
  const cdkFeatures   = detectCDKFeatures(content);
  const rxjsOps       = detectRxJS(content);
  const formCtrls     = detectFormControls(content);
  const hasFormArray  = detectFormArray(content);
  const hasNestedFG   = detectNestedFormGroup(content);
  const hasAsyncVal   = detectAsyncValidator(content);
  const hasCrossVal   = detectCrossFieldValidator(content);

  const complexity = calcComplexity(
    directives, cdkFeatures, rxjsOps, formCtrls, hasFormArray, false
  );

  const challenges: string[] = [];
  if (cdkFeatures.some(f => /Breakpoint/.test(f)))   challenges.push('BreakpointObserver → useMediaQuery hook');
  if (content.includes('CdkDrag'))                   challenges.push('CDK DragDrop → @dnd-kit');
  if (content.includes('FlatTreeControl'))            challenges.push('FlatTreeControl → MUI SimpleTreeView recursive render');
  if (content.includes('ReactiveFormsModule'))        challenges.push('ReactiveFormsModule → React Hook Form + Zod');
  if (hasFormArray)                                   challenges.push('FormArray → useFieldArray from react-hook-form');
  if (hasNestedFG)                                    challenges.push('Nested FormGroup → nested Zod object + dot-path register');
  if (hasAsyncVal)                                    challenges.push('AsyncValidator → RHF validate option or async Zod refinement');
  if (hasCrossVal)                                    challenges.push('Cross-field validator → z.superRefine()');
  if (rxjsOps.length > 2)                            challenges.push(`RxJS (${rxjsOps.slice(0, 4).join(', ')}) → React hooks`);

  return {
    id:                     className.replace('Component', '').toLowerCase(),
    angularClass:           className,
    angularFile:            relativePath,
    reactOutputFile:        `src/${reactPath}`,
    directives,
    materialModules:        materialMod,
    cdkFeatures,
    rxjsOperators:          rxjsOps,
    formControls:           formCtrls,
    hasFormArray,
    hasNestedFormGroup:     hasNestedFG,
    hasAsyncValidator:      hasAsyncVal,
    hasCrossFieldValidator: hasCrossVal,
    complexity,
    conversionChallenges:   challenges,
  };
}

// ── Tool ────────────────────────────────────────────────────────────────────

export class AnalyzeTool implements vscode.LanguageModelTool<AnalyzeInput> {
  constructor(private readonly _workspaceRoot: string) {}

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<AnalyzeInput>,
    token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const projectPath = options.input.angularProjectPath;
    const outDir      = options.input.outputPath ?? outputDir(projectPath);
    const srcRoot     = path.join(projectPath, 'src');

    if (!fs.existsSync(srcRoot)) {
      return makeResult(`❌ No src/ directory at: ${projectPath}`);
    }

    // ── Scan all .component.ts files ─────────────────────────────────────────
    const componentFiles = findAngularComponents(srcRoot);
    if (componentFiles.length === 0) {
      return makeResult(`❌ No Angular components found in ${srcRoot}`);
    }

    const components: ComponentAnalysis[] = [];
    for (const file of componentFiles) {
      if (token.isCancellationRequested) break;
      components.push(analyzeComponent(file, srcRoot));
    }

    // ── Project-level pattern scans ───────────────────────────────────────────
    const services         = scanServices(srcRoot);
    const httpPatterns     = scanHttpPatterns(srcRoot);
    const pipes            = scanPipes(srcRoot);
    const directives       = scanDirectives(srcRoot);
    const { guards, resolvers } = scanGuards(srcRoot);
    const stateManagement  = detectStateManagement(projectPath, srcRoot);
    const animations       = scanAnimations(srcRoot);
    const injectionTokens  = scanInjectionTokens(srcRoot);
    const formArrayFiles   = scanFormArrays(srcRoot);

    const patterns: ProjectPatterns = {
      services,
      httpPatterns,
      pipes,
      directives,
      guards,
      resolvers,
      stateManagement,
      animations,
      injectionTokens,
      formArrays: formArrayFiles,
    };

    // ── Read app.routes.ts for route metadata ─────────────────────────────────
    const routesPath    = path.join(srcRoot, 'app', 'app.routes.ts');
    const routesContent = fs.existsSync(routesPath) ? fs.readFileSync(routesPath, 'utf8') : '';
    const routes = [...routesContent.matchAll(/path:\s*['"](\w[\w-]*)['"].*?title:\s*['"]([^'"]+)['"]/g)]
      .map(m => ({ path: m[1], title: m[2] }));

    // ── Build full report ─────────────────────────────────────────────────────
    const report = {
      analysisDate:    new Date().toISOString(),
      angularVersion:  getPackageVersion(projectPath, '@angular/core') ?? 'unknown',
      totalComponents: components.length,
      components,
      patterns,
      routing: {
        type:   'lazy',
        routes,   // derived from app.routes.ts; empty if not found
      },
      stateManagement:  stateManagement.type,
      recommendedReactLibs: buildRecommendedLibs(patterns, stateManagement),
      testFramework:    'karma+jasmine',
      conversionOrder:  [...components]
        .sort((a, b) => {
          const rank = { low: 0, medium: 1, high: 2 };
          return rank[a.complexity] - rank[b.complexity];
        })
        .map(c => c.id),
    };

    // ── Write output ──────────────────────────────────────────────────────────
    fs.mkdirSync(outDir, { recursive: true });
    const reportFile = path.join(outDir, 'conversion-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    writeCheckpoint(projectPath, '01-analysis.done');

    // ── Build human-readable summary ──────────────────────────────────────────
    const lines: string[] = [
      `## ✅ Agent 1: Full Analysis Complete`,
      ``,
      `**Project:** \`${projectPath}\``,
      `**Angular version:** ${report.angularVersion}`,
      `**Report written to:** \`${reportFile}\``,
      ``,
      `### Components (${components.length})`,
      `| Component | Complexity | Key Challenges |`,
      `|-----------|------------|----------------|`,
      ...components.map(c =>
        `| ${c.angularClass} | ${c.complexity} | ${c.conversionChallenges[0] ?? '—'} |`
      ),
      ``,
      `### Services (${services.length})`,
      services.length === 0 ? '_None detected_' : services.map(s =>
        `- **${s.className}** → ${s.reactTarget}${s.hasBehaviorSubject ? ' (has BehaviorSubject)' : ''}${s.hasHttpClient ? ' (has HttpClient)' : ''}`
      ).join('\n'),
      ``,
      `### HTTP / Interceptors (${httpPatterns.length})`,
      httpPatterns.length === 0 ? '_None detected_' : httpPatterns.map(h =>
        `- \`${h.file}\` (${h.type}) → ${h.reactTarget}${h.endpoints.length ? `; endpoints: ${h.endpoints.slice(0,3).join(', ')}` : ''}`
      ).join('\n'),
      ``,
      `### Pipes (${pipes.length})`,
      pipes.length === 0 ? '_None detected_' : pipes.map(p =>
        `- **${p.pipeName}** (${p.isBuiltin ? 'built-in' : 'custom'}) → ${p.reactTarget}`
      ).join('\n'),
      ``,
      `### Directives (${directives.length})`,
      directives.length === 0 ? '_None detected_' : directives.map(d =>
        `- **${d.className}** [${d.type}] → ${d.reactTarget}`
      ).join('\n'),
      ``,
      `### Route Guards (${guards.length}) & Resolvers (${resolvers.length})`,
      guards.length === 0 && resolvers.length === 0 ? '_None detected_' : [
        ...guards.map(g => `- **${g.className}** (${g.guardType}) → ${g.reactTarget}`),
        ...resolvers.map(r => `- **${r.className}** (Resolve) → ${r.reactTarget}`),
      ].join('\n'),
      ``,
      `### State Management`,
      `- **Type:** ${stateManagement.type}`,
      `- **Package:** ${stateManagement.package ?? 'none'}`,
      `- **React target:** ${stateManagement.reactLib}`,
      stateManagement.slices.length > 0 ? `- **NgRx slices:** ${stateManagement.slices.join(', ')}` : '',
      ``,
      `### Animations (${animations.length} files)`,
      animations.length === 0 ? '_None detected_' : animations.map(a =>
        `- \`${a.file}\`: triggers [${a.triggers.join(', ')}] → CSS transitions / Framer Motion`
      ).join('\n'),
      ``,
      `### Advanced Forms`,
      `- FormArray usages: ${formArrayFiles.length > 0 ? formArrayFiles.join(', ') : 'none'}`,
      `- InjectionTokens: ${injectionTokens.length > 0 ? injectionTokens.join(', ') : 'none'}`,
      ``,
      `### Recommended React Libraries`,
      ...report.recommendedReactLibs.map(l => `- ${l}`),
      ``,
      `### Next Step`,
      `Run \`#ng2reactScaffold\` to create the React project structure.`,
    ].filter(line => line !== '');

    return makeResult(lines.join('\n'));
  }

  prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<AnalyzeInput>,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return {
      invocationMessage: `Scanning Angular project at ${options.input.angularProjectPath}…`,
      confirmationMessages: {
        title:   'Analyze Angular Project',
        message: new vscode.MarkdownString(
          `Scan \`${options.input.angularProjectPath}\` for **all** Angular patterns ` +
          `(components, services, HTTP, pipes, directives, guards, state, animations) ` +
          `and write **conversion-report.json**?`
        ),
      },
    };
  }
}

// ── Recommend libraries based on detected patterns ─────────────────────────

function buildRecommendedLibs(patterns: ProjectPatterns, state: StateInfo): string[] {
  const libs = new Set<string>();

  // Always included
  libs.add('react@18 + react-dom@18');
  libs.add('@mui/material@5 + @emotion/react + @emotion/styled');
  libs.add('react-router-dom@6');
  libs.add('typescript@5');
  libs.add('vite@5 + @vitejs/plugin-react');
  libs.add('vitest + @testing-library/react');

  if (patterns.httpPatterns.length > 0)                 libs.add('axios (HttpClient replacement)');
  if (patterns.pipes.length > 0)                        libs.add('date-fns (DatePipe replacement, optional)');
  if (patterns.guards.some(g => g.guardType === 'CanDeactivate')) libs.add('react-router-dom useBlocker');
  if (patterns.formArrays.length > 0)                   libs.add('react-hook-form useFieldArray + zod');
  if (patterns.animations.length > 0)                   libs.add('framer-motion (Angular Animations replacement)');
  if (state.type === 'ngrx' || state.type === 'ngxs')  libs.add('@reduxjs/toolkit + react-redux');
  else if (state.type !== 'component-local')             libs.add('zustand');

  return [...libs];
}
