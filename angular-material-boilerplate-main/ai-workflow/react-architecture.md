# Target React Architecture

## Tech Stack

| Concern | Package | Version | Replaces |
|---------|---------|---------|---------|
| UI Framework | `react` + `react-dom` | ^18.3 | @angular/core |
| Language | TypeScript (strict) | ^5.5 | TypeScript 5.5 |
| Build Tool | Vite | ^5.4 | @angular-devkit/build-angular |
| UI Components | `@mui/material` | ^5.16 | @angular/material |
| Icons | `@mui/icons-material` | ^5.16 | material-icons / material-symbols |
| Routing | `react-router-dom` | ^6.26 | @angular/router |
| Forms | `react-hook-form` | ^7.53 | @angular/forms |
| Form Validation | `zod` + `@hookform/resolvers` | ^3.23 | Angular Validators |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` | ^6.1 | @angular/cdk DragDrop |
| Testing | `vitest` + `@testing-library/react` | ^2.1 | karma + jasmine |
| Test Utils | `@testing-library/user-event` | ^14.5 | TestBed |
| Environment | `import.meta.env` (Vite built-in) | — | Angular environments/ |

---

## Directory Structure

```
react-app/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── main.tsx                    # Entry point (replaces main.ts)
│   ├── App.tsx                     # Root component (replaces app.component.ts)
│   │
│   ├── router/
│   │   └── index.tsx               # All routes (replaces app.routes.ts)
│   │
│   ├── theme/
│   │   ├── theme.ts                # MUI createTheme (replaces m3-theme.scss)
│   │   ├── ThemeContext.tsx        # Dark/light mode context
│   │   └── GlobalStyles.tsx       # Global CSS (replaces styles.scss)
│   │
│   ├── config/
│   │   ├── env.ts                  # import.meta.env wrapper (replaces environments/)
│   │   └── env.types.ts            # IEnvironment interface
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── LayoutComponent.tsx      # Sidebar + toolbar (replaces layout.component)
│   │   │   └── LayoutComponent.test.tsx
│   │   └── shared/
│   │       ├── ThemeToggle.tsx          # Dark/light toggle (replaces theme-toggle.component)
│   │       └── ThemeToggle.test.tsx
│   │
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── DashboardComponent.tsx   # Grid cards (replaces dashboard.component)
│   │   │   └── DashboardComponent.test.tsx
│   │   ├── drag-drop/
│   │   │   ├── DragDropComponent.tsx    # dnd-kit lists (replaces drag-drop.component)
│   │   │   └── DragDropComponent.test.tsx
│   │   ├── table/
│   │   │   ├── TableComponent.tsx       # MUI DataGrid (replaces table.component)
│   │   │   ├── table.types.ts           # Row type definitions
│   │   │   └── TableComponent.test.tsx
│   │   ├── address-form/
│   │   │   ├── AddressFormComponent.tsx # RHF + Zod (replaces address-form.component)
│   │   │   ├── addressForm.schema.ts    # Zod schema (replaces Validators)
│   │   │   └── AddressFormComponent.test.tsx
│   │   └── tree/
│   │       ├── TreeComponent.tsx        # MUI TreeView (replaces tree.component)
│   │       ├── tree.data.ts             # Example data (replaces example-data.ts)
│   │       └── TreeComponent.test.tsx
│   │
│   ├── hooks/
│   │   ├── useThemeMode.ts         # Dark/light toggle logic
│   │   └── useBreakpoint.ts        # Responsive helper (replaces BreakpointObserver)
│   │
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tsconfig.node.json
```

---

## Architecture Patterns

### 1. Routing (replaces Angular lazy routes)
```tsx
// src/router/index.tsx
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LayoutComponent from '../components/layout/LayoutComponent';

const Dashboard = lazy(() => import('../pages/dashboard/DashboardComponent'));
const DragDrop  = lazy(() => import('../pages/drag-drop/DragDropComponent'));
const Table     = lazy(() => import('../pages/table/TableComponent'));
const AddressForm = lazy(() => import('../pages/address-form/AddressFormComponent'));
const Tree      = lazy(() => import('../pages/tree/TreeComponent'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LayoutComponent />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',    element: <Suspense fallback={<div>Loading...</div>}><Dashboard /></Suspense> },
      { path: 'drag-drop',    element: <Suspense fallback={<div>Loading...</div>}><DragDrop /></Suspense> },
      { path: 'table',        element: <Suspense fallback={<div>Loading...</div>}><Table /></Suspense> },
      { path: 'address-form', element: <Suspense fallback={<div>Loading...</div>}><AddressForm /></Suspense> },
      { path: 'tree',         element: <Suspense fallback={<div>Loading...</div>}><Tree /></Suspense> },
      { path: '*',            element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
```

### 2. Theme Context (replaces Angular ThemeToggle + body class)
```tsx
// src/theme/ThemeContext.tsx
type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({ ... });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<ThemeMode>(
    () => (localStorage.getItem('theme') as ThemeMode) ?? (prefersDark ? 'dark' : 'light')
  );
  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };
  const theme = createTheme({ palette: { mode } });
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

### 3. Layout (replaces Angular LayoutComponent with BreakpointObserver)
```tsx
// src/components/layout/LayoutComponent.tsx
export default function LayoutComponent() {
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  // Drawer + Toolbar + Outlet
}
```

### 4. Form (replaces Angular ReactiveFormsModule)
```tsx
// src/pages/address-form/AddressFormComponent.tsx
const schema = z.object({ firstName: z.string().min(1), ... });
type FormValues = z.infer<typeof schema>;

export default function AddressFormComponent() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });
  const onSubmit = (data: FormValues) => console.log(data);
  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

### 5. Drag & Drop (replaces Angular CDK DragDrop)
```tsx
// src/pages/drag-drop/DragDropComponent.tsx
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
```

### 6. Tree (replaces Angular MatTree + FlatTreeControl)
```tsx
// src/pages/tree/TreeComponent.tsx
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
```

---

## Environment Config
```typescript
// src/config/env.ts
export interface IEnvironment {
  production: boolean;
  apiUrl: string;
  version: string;
}

export const environment: IEnvironment = {
  production: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:5173',
  version: import.meta.env.VITE_APP_VERSION ?? '0.0.0',
};
```

---

## Navigation Config
Replace Angular route `data: { title, icon }` with a typed nav config array:
```typescript
// src/router/nav-config.ts
export interface NavItem {
  path: string;
  title: string;
  icon: string; // MUI icon component name
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',    title: 'Dashboard',     icon: 'Dashboard' },
  { path: '/drag-drop',    title: 'Drag & Drop',   icon: 'DragIndicator' },
  { path: '/table',        title: 'Table',         icon: 'TableChart' },
  { path: '/address-form', title: 'Address Form',  icon: 'ContactMail' },
  { path: '/tree',         title: 'Tree',          icon: 'AccountTree' },
];
```
