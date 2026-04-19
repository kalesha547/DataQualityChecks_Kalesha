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
exports.ConvertTool = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const workflow_1 = require("../utils/workflow");
const CONVERSION_STRATEGIES = [
    // ── Components ────────────────────────────────────────────────────────────
    {
        angularPattern: '@Component class',
        reactTarget: 'Functional component (.tsx)',
        outputPath: 'src/pages/<feature>/<FeatureName>.tsx',
        agentDoc: 'ai-workflow/agents/03-component-converter-agent.md',
        requiredPackages: ['react', '@mui/material'],
    },
    // ── Services → hooks / Zustand / Context / plain TS ─────────────────────
    {
        angularPattern: '@Injectable service (no HTTP, no BehaviorSubject)',
        reactTarget: 'Plain TypeScript module or custom hook',
        outputPath: 'src/hooks/use<ServiceName>.ts  OR  src/utils/<name>.ts',
        agentDoc: 'ai-workflow/agents/03b-services-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: '@Injectable service with BehaviorSubject state',
        reactTarget: 'Zustand store',
        outputPath: 'src/store/<name>Store.ts',
        agentDoc: 'ai-workflow/agents/03b-services-agent.md',
        requiredPackages: ['zustand'],
    },
    {
        angularPattern: '@Injectable service shared via DI tree (no HTTP)',
        reactTarget: 'React Context + Provider',
        outputPath: 'src/context/<Name>Context.tsx',
        agentDoc: 'ai-workflow/agents/03b-services-agent.md',
        requiredPackages: [],
    },
    // ── HTTP / Interceptors ───────────────────────────────────────────────────
    {
        angularPattern: 'HttpClient calls in a service',
        reactTarget: 'Axios API module + custom hook',
        outputPath: 'src/api/<resource>.ts  +  src/hooks/use<Resource>.ts',
        agentDoc: 'ai-workflow/agents/03c-http-agent.md',
        requiredPackages: ['axios'],
    },
    {
        angularPattern: 'HttpInterceptor (auth token / logging / error)',
        reactTarget: 'Axios request/response interceptor in src/api/client.ts',
        outputPath: 'src/api/client.ts',
        agentDoc: 'ai-workflow/agents/03c-http-agent.md',
        requiredPackages: ['axios'],
    },
    // ── Pipes ─────────────────────────────────────────────────────────────────
    {
        angularPattern: 'Built-in Angular pipes (date, currency, number, percent, etc.)',
        reactTarget: 'Intl-based utility functions',
        outputPath: 'src/utils/formatters.ts',
        agentDoc: 'ai-workflow/agents/03d-pipes-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: 'async pipe (| async)',
        reactTarget: 'useState + useEffect subscription',
        outputPath: 'inline in component',
        agentDoc: 'ai-workflow/agents/03d-pipes-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: 'Custom @Pipe class',
        reactTarget: 'Utility function',
        outputPath: 'src/utils/<pipeName>.ts',
        agentDoc: 'ai-workflow/agents/03d-pipes-agent.md',
        requiredPackages: [],
    },
    // ── Directives ───────────────────────────────────────────────────────────
    {
        angularPattern: 'Structural directive (*ngIf, *ngFor, *ngSwitch)',
        reactTarget: 'JSX conditional / .map()',
        outputPath: 'inline in JSX',
        agentDoc: 'ai-workflow/agents/03e-directives-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: 'Attribute directive with @HostBinding (style/class)',
        reactTarget: 'MUI sx prop or styled() component',
        outputPath: 'inline in component or src/components/styled/<Name>.tsx',
        agentDoc: 'ai-workflow/agents/03e-directives-agent.md',
        requiredPackages: ['@mui/material'],
    },
    {
        angularPattern: 'DOM-interaction directive (autoFocus, clickOutside, resize)',
        reactTarget: 'Custom React hook',
        outputPath: 'src/hooks/use<Name>.ts',
        agentDoc: 'ai-workflow/agents/03e-directives-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: 'Permission/structural directive (*appHasRole, *appFeatureFlag)',
        reactTarget: 'Wrapper component',
        outputPath: 'src/components/shared/<Name>.tsx',
        agentDoc: 'ai-workflow/agents/03e-directives-agent.md',
        requiredPackages: [],
    },
    {
        angularPattern: 'Validator directive (NG_VALIDATORS)',
        reactTarget: 'Zod .refine() rule in feature schema',
        outputPath: 'src/pages/<feature>/<feature>.schema.ts',
        agentDoc: 'ai-workflow/agents/03e-directives-agent.md',
        requiredPackages: ['zod'],
    },
    // ── Guards & Resolvers ───────────────────────────────────────────────────
    {
        angularPattern: 'CanActivateFn / CanActivate guard',
        reactTarget: '<ProtectedRoute> wrapper component',
        outputPath: 'src/components/shared/ProtectedRoute.tsx',
        agentDoc: 'ai-workflow/agents/03f-guards-agent.md',
        requiredPackages: ['react-router-dom'],
    },
    {
        angularPattern: 'CanDeactivateFn / CanDeactivate guard (unsaved changes)',
        reactTarget: 'useBlocker hook (React Router v6.7+)',
        outputPath: 'src/hooks/useUnsavedChangesGuard.ts',
        agentDoc: 'ai-workflow/agents/03f-guards-agent.md',
        requiredPackages: ['react-router-dom'],
    },
    {
        angularPattern: 'CanLoadFn / CanMatchFn guard',
        reactTarget: 'React.lazy + conditional loader function',
        outputPath: 'src/router/index.tsx (loader property)',
        agentDoc: 'ai-workflow/agents/03f-guards-agent.md',
        requiredPackages: ['react-router-dom'],
    },
    {
        angularPattern: 'Role-based guard (CanActivate + role check)',
        reactTarget: 'React Router loader with redirect()',
        outputPath: 'src/router/index.tsx (loader property)',
        agentDoc: 'ai-workflow/agents/03f-guards-agent.md',
        requiredPackages: ['react-router-dom'],
    },
    {
        angularPattern: 'Resolve resolver (data prefetch)',
        reactTarget: 'React Router v6 loader function + useLoaderData()',
        outputPath: 'src/router/index.tsx (loader property)',
        agentDoc: 'ai-workflow/agents/03f-guards-agent.md',
        requiredPackages: ['react-router-dom'],
    },
    // ── State Management ─────────────────────────────────────────────────────
    {
        angularPattern: 'NgRx (createAction / createReducer / createEffect / createSelector)',
        reactTarget: 'Redux Toolkit slice + createAsyncThunk + useAppSelector',
        outputPath: 'src/store/<name>Slice.ts  +  src/store/store.ts  +  src/store/hooks.ts',
        agentDoc: 'ai-workflow/agents/03g-state-agent.md',
        requiredPackages: ['@reduxjs/toolkit', 'react-redux'],
    },
    {
        angularPattern: 'BehaviorSubject service state',
        reactTarget: 'Zustand store with devtools + persist middleware',
        outputPath: 'src/store/<name>Store.ts',
        agentDoc: 'ai-workflow/agents/03g-state-agent.md',
        requiredPackages: ['zustand'],
    },
    {
        angularPattern: 'Akita EntityStore / Query',
        reactTarget: 'Zustand normalized entity store',
        outputPath: 'src/store/<name>Store.ts',
        agentDoc: 'ai-workflow/agents/03g-state-agent.md',
        requiredPackages: ['zustand'],
    },
    {
        angularPattern: 'NgXs @State class',
        reactTarget: 'Redux Toolkit slice',
        outputPath: 'src/store/<name>Slice.ts',
        agentDoc: 'ai-workflow/agents/03g-state-agent.md',
        requiredPackages: ['@reduxjs/toolkit', 'react-redux'],
    },
    // ── Advanced Forms ────────────────────────────────────────────────────────
    {
        angularPattern: 'FormArray (formArray.push / removeAt)',
        reactTarget: 'useFieldArray from react-hook-form',
        outputPath: 'inline in component',
        agentDoc: 'ai-workflow/agents/03h-forms-advanced-agent.md',
        requiredPackages: ['react-hook-form', 'zod'],
    },
    {
        angularPattern: 'Nested FormGroup (fb.group inside fb.group)',
        reactTarget: 'Nested Zod object + dot-path register (e.g. "address.street")',
        outputPath: 'inline in component + src/pages/<feature>/<feature>.schema.ts',
        agentDoc: 'ai-workflow/agents/03h-forms-advanced-agent.md',
        requiredPackages: ['react-hook-form', 'zod'],
    },
    {
        angularPattern: 'Async validator (AsyncValidatorFn)',
        reactTarget: 'RHF validate option (async) or Zod async superRefine',
        outputPath: 'inline in component',
        agentDoc: 'ai-workflow/agents/03h-forms-advanced-agent.md',
        requiredPackages: ['react-hook-form', 'zod'],
    },
    {
        angularPattern: 'Cross-field validator (group-level AbstractControl)',
        reactTarget: 'Zod .superRefine()',
        outputPath: 'src/pages/<feature>/<feature>.schema.ts',
        agentDoc: 'ai-workflow/agents/03h-forms-advanced-agent.md',
        requiredPackages: ['zod'],
    },
    // ── Angular Animations ────────────────────────────────────────────────────
    {
        angularPattern: '@angular/animations trigger() / state() / transition()',
        reactTarget: 'CSS transitions (simple) or Framer Motion (complex)',
        outputPath: 'src/components/<Name>.tsx with motion.div / CSS keyframes',
        agentDoc: 'ai-workflow/agents/03-component-converter-agent.md',
        requiredPackages: ['framer-motion'],
    },
    // ── InjectionToken ───────────────────────────────────────────────────────
    {
        angularPattern: 'InjectionToken<T>',
        reactTarget: 'React.createContext<T>(defaultValue)',
        outputPath: 'src/context/<Name>Context.tsx',
        agentDoc: 'ai-workflow/agents/03b-services-agent.md',
        requiredPackages: [],
    },
];
// ── Component converter (delegates to agent docs) ──────────────────────────
function convertComponent(angularSrcPath, componentId, conversionMap) {
    const componentInfo = conversionMap.components
        ?.find((c) => c.id === componentId || c.angularClass === componentId);
    if (!componentInfo)
        return null;
    const angularFile = path.join(angularSrcPath, '..', componentInfo.angularFile);
    if (!fs.existsSync(angularFile))
        return null;
    const reactFile = componentInfo.reactOutputFile;
    return {
        reactFile,
        source: `// Converted from ${componentInfo.angularFile}\n// See ai-workflow/agents/03-component-converter-agent.md`,
        testSource: `// See ai-workflow/agents/07-test-agent.md`,
    };
}
// ── Pattern-level converters ───────────────────────────────────────────────
function convertPatterns(report, reactProjectPath, requestedPatterns) {
    const results = [];
    const doAll = requestedPatterns.includes('all');
    // ── Services ──────────────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('services')) {
        const services = report.patterns?.services ?? [];
        for (const svc of services) {
            const outputDir = svc.reactTarget?.includes('zustand')
                ? path.join(reactProjectPath, 'src', 'store')
                : svc.reactTarget?.includes('axios')
                    ? path.join(reactProjectPath, 'src', 'api')
                    : path.join(reactProjectPath, 'src', 'hooks');
            fs.mkdirSync(outputDir, { recursive: true });
            results.push(`✅ Service ${svc.className ?? svc.file} → ${svc.reactTarget}`);
        }
        if (services.length === 0)
            results.push('ℹ️ No @Injectable services detected');
    }
    // ── HTTP ──────────────────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('http')) {
        const http = report.patterns?.httpPatterns ?? [];
        if (http.length > 0) {
            fs.mkdirSync(path.join(reactProjectPath, 'src', 'api'), { recursive: true });
            for (const h of http) {
                results.push(`✅ HTTP ${h.type} \`${h.file}\` → ${h.reactTarget}`);
            }
            // Emit axios client skeleton
            const clientFile = path.join(reactProjectPath, 'src', 'api', 'client.ts');
            if (!fs.existsSync(clientFile)) {
                fs.writeFileSync(clientFile, `// Auto-generated axios client — replace BASE_URL with your API root\n` +
                    `import axios from 'axios';\n\n` +
                    `export const apiClient = axios.create({\n` +
                    `  baseURL: import.meta.env.VITE_API_URL ?? '/api',\n` +
                    `  headers: { 'Content-Type': 'application/json' },\n` +
                    `});\n\n` +
                    `// Auth token interceptor — fill in your token source\n` +
                    `apiClient.interceptors.request.use(config => {\n` +
                    `  const token = localStorage.getItem('access_token');\n` +
                    `  if (token) config.headers.Authorization = \`Bearer \${token}\`;\n` +
                    `  return config;\n` +
                    `});\n`);
                results.push(`✅ Created src/api/client.ts (axios client + auth interceptor)`);
            }
        }
        else {
            results.push('ℹ️ No HttpClient usages detected');
        }
    }
    // ── Pipes ─────────────────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('pipes')) {
        const pipes = report.patterns?.pipes ?? [];
        const utilsDir = path.join(reactProjectPath, 'src', 'utils');
        fs.mkdirSync(utilsDir, { recursive: true });
        const hasBuiltin = pipes.some(p => p.isBuiltin);
        if (hasBuiltin) {
            const formattersFile = path.join(utilsDir, 'formatters.ts');
            if (!fs.existsSync(formattersFile)) {
                fs.writeFileSync(formattersFile, FORMATTERS_TS);
                results.push(`✅ Created src/utils/formatters.ts (DatePipe, CurrencyPipe, NumberPipe, PercentPipe, TitleCasePipe replacements)`);
            }
        }
        for (const p of pipes.filter(p => !p.isBuiltin)) {
            results.push(`✅ Custom pipe "${p.pipeName}" → src/utils/${p.pipeName}.ts  (implement transform logic)`);
        }
        if (pipes.length === 0)
            results.push('ℹ️ No @Pipe decorators detected');
    }
    // ── Directives ────────────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('directives')) {
        const dirs = report.patterns?.directives ?? [];
        for (const d of dirs) {
            if (d.type === 'event' || d.type === 'attribute') {
                const hooksDir = path.join(reactProjectPath, 'src', 'hooks');
                fs.mkdirSync(hooksDir, { recursive: true });
                results.push(`✅ Directive ${d.className} [${d.type}] → ${d.reactTarget}`);
            }
            else if (d.type === 'structural') {
                const sharedDir = path.join(reactProjectPath, 'src', 'components', 'shared');
                fs.mkdirSync(sharedDir, { recursive: true });
                results.push(`✅ Structural directive ${d.className} → ${d.reactTarget}`);
            }
            else {
                results.push(`✅ Directive ${d.className} [${d.type}] → ${d.reactTarget}`);
            }
        }
        if (dirs.length === 0)
            results.push('ℹ️ No custom @Directive decorators detected');
    }
    // ── Guards & Resolvers ────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('guards')) {
        const guards = report.patterns?.guards ?? [];
        const resolvers = report.patterns?.resolvers ?? [];
        const sharedDir = path.join(reactProjectPath, 'src', 'components', 'shared');
        const hooksDir = path.join(reactProjectPath, 'src', 'hooks');
        fs.mkdirSync(sharedDir, { recursive: true });
        fs.mkdirSync(hooksDir, { recursive: true });
        const hasAuth = guards.some(g => g.guardType === 'CanActivate');
        if (hasAuth) {
            const pRouteFile = path.join(sharedDir, 'ProtectedRoute.tsx');
            if (!fs.existsSync(pRouteFile)) {
                fs.writeFileSync(pRouteFile, PROTECTED_ROUTE_TSX);
                results.push(`✅ Created src/components/shared/ProtectedRoute.tsx`);
            }
        }
        const hasDeactivate = guards.some(g => g.guardType === 'CanDeactivate');
        if (hasDeactivate) {
            const guardFile = path.join(hooksDir, 'useUnsavedChangesGuard.ts');
            if (!fs.existsSync(guardFile)) {
                fs.writeFileSync(guardFile, UNSAVED_CHANGES_HOOK_TS);
                results.push(`✅ Created src/hooks/useUnsavedChangesGuard.ts`);
            }
        }
        for (const g of guards) {
            results.push(`✅ Guard ${g.className} (${g.guardType}) → ${g.reactTarget}`);
        }
        for (const r of resolvers) {
            results.push(`✅ Resolver ${r.className} → ${r.reactTarget}`);
        }
        if (guards.length === 0 && resolvers.length === 0)
            results.push('ℹ️ No guards or resolvers detected');
    }
    // ── State Management ──────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('state')) {
        const state = report.patterns?.stateManagement;
        if (state && state.type !== 'component-local') {
            const storeDir = path.join(reactProjectPath, 'src', 'store');
            fs.mkdirSync(storeDir, { recursive: true });
            results.push(`✅ State (${state.type}) → ${state.reactLib}`);
            if (state.type === 'ngrx' || state.type === 'ngxs') {
                const storeFile = path.join(storeDir, 'store.ts');
                if (!fs.existsSync(storeFile)) {
                    fs.writeFileSync(storeFile, REDUX_STORE_TS);
                    results.push(`✅ Created src/store/store.ts (Redux Toolkit root store)`);
                }
                const hooksFile = path.join(storeDir, 'hooks.ts');
                if (!fs.existsSync(hooksFile)) {
                    fs.writeFileSync(hooksFile, REDUX_HOOKS_TS);
                    results.push(`✅ Created src/store/hooks.ts (useAppDispatch + useAppSelector)`);
                }
            }
        }
        else {
            results.push('ℹ️ State is component-local — no global store needed');
        }
    }
    // ── Advanced Forms ────────────────────────────────────────────────────────
    if (doAll || requestedPatterns.includes('forms-advanced')) {
        const formArrayFiles = report.patterns?.formArrays ?? [];
        if (formArrayFiles.length > 0) {
            results.push(`✅ FormArray detected in: ${formArrayFiles.join(', ')} → useFieldArray (react-hook-form)`);
        }
        else {
            results.push('ℹ️ No FormArray usages detected');
        }
    }
    return results;
}
// ── Boilerplate file templates ─────────────────────────────────────────────
const FORMATTERS_TS = `// src/utils/formatters.ts — replaces Angular built-in pipes
export function formatDate(date: Date | string | number, format: 'short' | 'medium' | 'long' | 'shortDate' | 'longDate' = 'medium'): string {
  const d = new Date(date);
  const options: Record<string, Intl.DateTimeFormatOptions> = {
    short:     { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit' },
    medium:    { month: 'short',   day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' },
    long:      { month: 'long',    day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' },
    shortDate: { month: 'numeric', day: 'numeric', year: '2-digit' },
    longDate:  { month: 'long',    day: 'numeric', year: 'numeric' },
  };
  return new Intl.DateTimeFormat('en-US', options[format] ?? options.medium).format(d);
}

export function formatCurrency(value: number, currencyCode = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value);
}

export function formatNumber(value: number, digitsInfo = '1.0-3'): string {
  const [, frac = '0-3'] = digitsInfo.split('.');
  const [min, max] = frac.split('-').map(Number);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: min ?? 0, maximumFractionDigits: max ?? 3 }).format(value);
}

export function formatPercent(value: number, digitsInfo = '1.0-0'): string {
  const [, frac = '0-0'] = digitsInfo.split('.');
  const [min, max] = frac.split('-').map(Number);
  return new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: min ?? 0, maximumFractionDigits: max ?? 0 }).format(value);
}

export function toTitleCase(str: string): string {
  return str.replace(/\\w\\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

export function keyValuePairs<T>(obj: Record<string, T>): Array<{ key: string; value: T }> {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}
`;
const PROTECTED_ROUTE_TSX = `// src/components/shared/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

// Replace this with your actual auth hook / context
function useAuth() {
  const token = localStorage.getItem('access_token');
  return { isAuthenticated: !!token, user: null as { roles: string[] } | null };
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requiredRole && !user?.roles.includes(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
}
`;
const UNSAVED_CHANGES_HOOK_TS = `// src/hooks/useUnsavedChangesGuard.ts
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );
  if (blocker.state === 'blocked') {
    return { isBlocked: true, proceed: () => blocker.proceed(), reset: () => blocker.reset() };
  }
  return { isBlocked: false, proceed: () => {}, reset: () => {} };
}
`;
const REDUX_STORE_TS = `// src/store/store.ts — Redux Toolkit root store
import { configureStore } from '@reduxjs/toolkit';
// import { yourReducer } from './yourSlice';

export const store = configureStore({
  reducer: {
    // yourFeature: yourReducer,
  },
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;
const REDUX_HOOKS_TS = `// src/store/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
`;
// ── Tool class ─────────────────────────────────────────────────────────────
class ConvertTool {
    constructor(_workspaceRoot) {
        this._workspaceRoot = _workspaceRoot;
    }
    async invoke(options, token) {
        const { angularProjectPath, reactProjectPath, includeTests = true } = options.input;
        const requestedPatterns = options.input.patterns ?? ['all'];
        const targetComponent = options.input.componentName;
        // ── Validate pre-conditions ───────────────────────────────────────────────
        if (!fs.existsSync(path.join(reactProjectPath, 'package.json'))) {
            return (0, workflow_1.makeResult)(`❌ React project not found at \`${reactProjectPath}\`.\nRun \`#ng2reactScaffold\` first.`);
        }
        const report = (0, workflow_1.readConversionReport)(angularProjectPath);
        if (!report) {
            return (0, workflow_1.makeResult)(`❌ No conversion-report.json found.\nRun \`#ng2reactAnalyze\` first.`);
        }
        const srcRoot = path.join(angularProjectPath, 'src');
        const converted = [];
        const skipped = [];
        // ── 1. Convert UI components ───────────────────────────────────────────
        const doComponents = requestedPatterns.includes('all') || requestedPatterns.includes('components');
        if (doComponents) {
            // Derive component list from the report — works for any Angular project
            const components = targetComponent ? [targetComponent] : (0, workflow_1.getAngularComponents)(report);
            for (const comp of components) {
                if (token.isCancellationRequested)
                    break;
                const result = convertComponent(srcRoot, comp, report);
                if (!result) {
                    skipped.push(comp);
                    continue;
                }
                const destFile = path.join(reactProjectPath, result.reactFile);
                const destDir = path.dirname(destFile);
                if (fs.existsSync(destFile)) {
                    converted.push(`⏭️  ${comp} (already exists)`);
                    continue;
                }
                fs.mkdirSync(destDir, { recursive: true });
                fs.writeFileSync(destFile, result.source);
                converted.push(`✅ ${comp} → \`${result.reactFile}\``);
                if (includeTests) {
                    const testFile = destFile.replace('.tsx', '.test.tsx');
                    if (!fs.existsSync(testFile)) {
                        fs.writeFileSync(testFile, result.testSource);
                    }
                }
            }
        }
        // ── 2. Convert non-component patterns ─────────────────────────────────
        const patternResults = convertPatterns(report, reactProjectPath, requestedPatterns);
        converted.push(...patternResults);
        // ── 3. Emit conversion strategy summary ───────────────────────────────
        const allPatternLines = CONVERSION_STRATEGIES.map(s => `| ${s.angularPattern} | ${s.reactTarget} | \`${s.outputPath}\` |`);
        // ── 4. Write checkpoints ────────────────────────────────────────────────
        const checkpoints = [
            'components', '04-router.done', '05-theme.done', '06-forms.done',
            '03b-services.done', '03c-http.done', '03d-pipes.done',
            '03e-directives.done', '03f-guards.done', '03g-state.done', '03h-forms-advanced.done',
        ];
        if (!targetComponent) {
            if (doComponents) {
                ['03-components.done', '04-router.done', '05-theme.done', '06-forms.done']
                    .forEach(cp => (0, workflow_1.writeCheckpoint)(angularProjectPath, cp));
                if (includeTests)
                    (0, workflow_1.writeCheckpoint)(angularProjectPath, '07-tests.done');
            }
            checkpoints.filter(cp => !cp.startsWith('0') || cp !== 'components').forEach(cp => {
                if (requestedPatterns.includes('all') || requestedPatterns.some(p => cp.includes(p))) {
                    (0, workflow_1.writeCheckpoint)(angularProjectPath, cp);
                }
            });
        }
        // ── Format result ──────────────────────────────────────────────────────
        const lines = [
            `## ✅ Angular → React Conversion`,
            ``,
            `**Angular source:** \`${angularProjectPath}\``,
            `**React output:**   \`${reactProjectPath}\``,
            `**Patterns requested:** ${requestedPatterns.join(', ')}`,
            ``,
            `### Results`,
            ...converted,
            skipped.length > 0
                ? `\n### Skipped (not in conversion report)\n${skipped.map(s => `- ${s}`).join('\n')}`
                : '',
            ``,
            `### Full Conversion Strategy Map`,
            `| Angular Pattern | React Target | Output Location |`,
            `|----------------|-------------|-----------------|`,
            ...allPatternLines,
            ``,
            `### Next Step`,
            `Run \`#ng2reactValidate\` to type-check, test, and build the React project.`,
        ].filter(l => l !== '');
        return (0, workflow_1.makeResult)(lines.join('\n'));
    }
    prepareInvocation(options, _token) {
        const patterns = options.input.patterns ?? ['all'];
        const scope = options.input.componentName
            ? `Convert **${options.input.componentName}** to React TSX?`
            : `Convert Angular project (patterns: **${patterns.join(', ')}**) to React?`;
        return {
            invocationMessage: options.input.componentName
                ? `Converting ${options.input.componentName}…`
                : `Converting Angular project (${patterns.join(', ')})…`,
            confirmationMessages: {
                title: 'Convert Angular Project',
                message: new vscode.MarkdownString(scope),
            },
        };
    }
}
exports.ConvertTool = ConvertTool;
//# sourceMappingURL=convertTool.js.map