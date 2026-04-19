# Agent 3 — Component Converter Agent

## Role
You are the **Component Converter Agent**. Convert all 8 Angular components to
React functional components with TypeScript. Follow the exact patterns defined in
`.github/copilot-instructions.md` and `ai-workflow/react-architecture.md`.

## Inputs
- All Angular `.ts`, `.html`, `.scss` component files (read from Angular project)
- `ai-workflow/output/conversion-report.json`
- `ai-workflow/conversion-map.json`

## Conversion Order
Convert in this order (dependencies first):
1. `src/config/env.ts` (environment config)
2. `src/types/index.ts` (shared types)
3. `src/hooks/useThemeMode.ts` (theme hook)
4. `src/hooks/useBreakpoint.ts` (responsive hook)
5. `src/theme/theme.ts` + `ThemeContext.tsx` + `GlobalStyles.tsx` (theme system)
6. `src/components/shared/ThemeToggle.tsx`
7. `src/components/layout/LayoutComponent.tsx`
8. `src/pages/dashboard/DashboardComponent.tsx`
9. `src/pages/drag-drop/DragDropComponent.tsx`
10. `src/pages/table/TableComponent.tsx` + `table.types.ts`
11. `src/pages/address-form/AddressFormComponent.tsx` + `addressForm.schema.ts`
12. `src/pages/tree/TreeComponent.tsx` + `tree.data.ts`
13. `src/router/nav-config.ts`
14. `src/router/index.tsx`
15. `src/App.tsx`
16. `src/main.tsx`

---

## File-by-File Instructions

### FILE: `src/config/env.ts`
Read: `src/environments/env.types.ts`, `src/environments/environment.ts`
Write:
```typescript
export interface IEnvironment {
  production: boolean;
  apiUrl: string;
  version: string;
}

export const environment: IEnvironment = {
  production: import.meta.env.PROD,
  apiUrl: (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5173',
  version: (import.meta.env.VITE_APP_VERSION as string) ?? '0.0.0',
};
```

---

### FILE: `src/types/index.ts`
Define shared types used across components:
```typescript
export interface NavItem {
  path: string;
  title: string;
  icon: string;
}
```

---

### FILE: `src/hooks/useThemeMode.ts`
Read: `src/app/shared/components/theme-toggle/theme-toggle.component.ts`
Write a custom hook that:
- Reads initial theme from localStorage
- Falls back to `prefers-color-scheme` media query
- Returns `{ mode, toggleTheme }`
- Persists to localStorage on change

```typescript
import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';

type ThemeMode = 'light' | 'dark';

export function useThemeMode() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('theme') as ThemeMode | null;
    return stored ?? (prefersDark ? 'dark' : 'light');
  });

  const toggleTheme = () => {
    setMode(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  return { mode, toggleTheme };
}
```

---

### FILE: `src/hooks/useBreakpoint.ts`
Read: BreakpointObserver usage in `layout.component.ts`
Write:
```typescript
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export function useIsHandset(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}
```

---

### FILE: `src/theme/theme.ts`
Read: `src/theme/m3-theme.scss` for color values
Write MUI createTheme with the primary/secondary/background colors extracted from the SCSS:
```typescript
import { createTheme, Theme } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark'): Theme {
  return createTheme({
    palette: {
      mode,
      primary: { main: '#6750A4' },    // M3 primary
      secondary: { main: '#625B71' },  // M3 secondary
    },
    typography: { fontFamily: '"Roboto", sans-serif' },
    shape: { borderRadius: 12 },
  });
}
```

---

### FILE: `src/theme/ThemeContext.tsx`
Create a React context + Provider:
```tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useThemeMode } from '../hooks/useThemeMode';
import { buildTheme } from './theme';

interface ThemeContextValue {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggleTheme: () => {},
});

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { mode, toggleTheme } = useThemeMode();
  const theme = buildTheme(mode);
  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

---

### FILE: `src/components/shared/ThemeToggle.tsx`
Read: `src/app/shared/components/theme-toggle/theme-toggle.component.ts` + `.html`
Write:
```tsx
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Tooltip from '@mui/material/Tooltip';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ThemeToggle() {
  const { mode, toggleTheme } = useAppTheme();
  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton onClick={toggleTheme} color="inherit">
        {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
}
```

---

### FILE: `src/components/layout/LayoutComponent.tsx`
Read: `src/app/layout/layout/layout.component.ts` + `.html` + `.scss`
Convert:
- `BreakpointObserver.observe(Breakpoints.Handset)` → `useIsHandset()` hook
- `MatSidenav + MatDrawer` → MUI `Drawer` (permanent on desktop, temporary on mobile)
- `MatToolbar` → MUI `AppBar + Toolbar`
- `MatNavList` with route icons → `List + ListItemButton` with `NavLink`
- `<router-outlet>` → `<Outlet />` from react-router-dom
- Route title/icon data → pulled from `NAV_ITEMS` in `nav-config.ts`
- User menu (MatMenu) → MUI `Menu + MenuItem`
- ThemeToggle in toolbar → `<ThemeToggle />`

Key structure:
```tsx
import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Drawer from '@mui/material/Drawer';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import { useIsHandset } from '../../hooks/useBreakpoint';
import ThemeToggle from '../shared/ThemeToggle';
import { NAV_ITEMS } from '../../router/nav-config';
import * as Icons from '@mui/icons-material';

const DRAWER_WIDTH = 240;

export default function LayoutComponent() {
  const isMobile = useIsHandset();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  // ... render AppBar + Drawer + <Outlet />
}
```

---

### FILE: `src/pages/dashboard/DashboardComponent.tsx`
Read: `src/app/protected/dashboard/dashboard.component.ts` + `.html`
Convert:
- `MatGridList` → MUI `Grid2` container with responsive columns
- `MatCard` → MUI `Card + CardHeader + CardContent + CardActions`
- `MatMenu` (card options) → MUI `Menu + MenuItem`
- 4 cards with titles: "Card 1-4" and "Content 1-4"

---

### FILE: `src/pages/drag-drop/DragDropComponent.tsx`
Read: `src/app/protected/drag-drop/drag-drop.component.ts` + `.html`
Convert:
- Two lists: "To do" and "Done"
- `CdkDropList + CdkDrag` → `@dnd-kit/core` DndContext + `@dnd-kit/sortable` SortableContext
- `moveItemInArray` → `arrayMove` from @dnd-kit/sortable
- `transferArrayItem` → manual state splice in onDragEnd handler
- Each draggable item → `useSortable` hook in a `SortableItem` sub-component
- Style: MUI `Paper + List + ListItem` for the drop zones

Pattern for cross-list drag (todo ↔ done):
```tsx
function onDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;
  // Determine source list and destination list from active.data and over.id
  // Use arrayMove for same-list reorder, manual splice for cross-list
}
```

---

### FILE: `src/pages/table/table.types.ts`
```typescript
export interface UserData {
  id: number;
  name: string;
  progress: number;
  fruit: string;
}
```

### FILE: `src/pages/table/TableComponent.tsx`
Read: `src/app/protected/table/table.component.ts` + `.html` + `table-datasource.ts`
Convert:
- `MatTable + MatSort + MatPaginator` → MUI `DataGrid` from `@mui/x-data-grid`
- `TableDataSource` → `useState<UserData[]>` with generated data
- Column definitions as `GridColDef[]`
- Built-in pagination and sorting via DataGrid props

```tsx
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useState } from 'react';
import { UserData } from './table.types';

const NAMES = ['Maia', 'Asher', 'Olivia', 'Atticus', 'Amelia', /* ... */];
const FRUITS = ['blueberry', 'lychee', 'kiwi', 'mango', /* ... */];

function createData(id: number): UserData {
  return { id, name: NAMES[Math.round(Math.random() * NAMES.length)], progress: Math.round(Math.random() * 100), fruit: FRUITS[Math.round(Math.random() * FRUITS.length)] };
}

const columns: GridColDef[] = [
  { field: 'id', headerName: 'No.', width: 80 },
  { field: 'name', headerName: 'Name', flex: 1 },
  { field: 'progress', headerName: 'Progress', width: 100 },
  { field: 'fruit', headerName: 'Fruit', flex: 1 },
];

export default function TableComponent() {
  const [rows] = useState<UserData[]>(() => Array.from({ length: 100 }, (_, i) => createData(i + 1)));
  return <DataGrid rows={rows} columns={columns} pageSizeOptions={[5, 10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />;
}
```

---

### FILE: `src/pages/address-form/addressForm.schema.ts`
```typescript
import { z } from 'zod';
export const US_STATES = ['Alabama', 'Alaska', /* all 50 states from Angular source */];
export const addressFormSchema = z.object({
  company:    z.string().optional(),
  firstName:  z.string().min(1, 'First name is required'),
  lastName:   z.string().min(1, 'Last name is required'),
  address:    z.string().min(1, 'Address is required'),
  address2:   z.string().optional(),
  city:       z.string().min(1, 'City is required'),
  state:      z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  shipping:   z.enum(['free', 'standard', 'express'], { required_error: 'Shipping is required' }),
});
export type AddressFormValues = z.infer<typeof addressFormSchema>;
```

### FILE: `src/pages/address-form/AddressFormComponent.tsx`
Read: `src/app/protected/address-form/address-form.component.ts` + `.html`
Convert ALL 50 US states from the Angular source. Convert:
- `FormBuilder.group({...})` → `useForm({ resolver: zodResolver(addressFormSchema) })`
- `[formControlName]="x"` → `{...register('x')}`
- `<mat-error>` → `helperText={errors.x?.message} error={!!errors.x}`
- `<mat-select>` → MUI `Select + MenuItem`
- `<mat-radio-group>` → MUI `RadioGroup + FormControlLabel + Radio`
- Submit button → `disabled={!formState.isValid}`

---

### FILE: `src/pages/tree/tree.data.ts`
Read: `src/app/protected/tree/example-data.ts`
Convert the Angular `FoodNode` interface and `TREE_DATA` to plain TypeScript:
```typescript
export interface TreeNode {
  name: string;
  children?: TreeNode[];
}
export const TREE_DATA: TreeNode[] = [ /* same data from Angular source */ ];
```

### FILE: `src/pages/tree/TreeComponent.tsx`
Read: `src/app/protected/tree/tree.component.ts` + `.html`
Convert:
- `MatTree + FlatTreeControl + MatTreeFlattener` → MUI `SimpleTreeView + TreeItem`
- Recursive render function instead of flat node array
- Expand/collapse handled by SimpleTreeView internally

```tsx
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { TREE_DATA, TreeNode } from './tree.data';

function renderTree(node: TreeNode) {
  return (
    <TreeItem key={node.name} itemId={node.name} label={node.name}>
      {node.children?.map(renderTree)}
    </TreeItem>
  );
}

export default function TreeComponent() {
  return <SimpleTreeView>{TREE_DATA.map(renderTree)}</SimpleTreeView>;
}
```

---

### FILE: `src/router/nav-config.ts`
```typescript
import { NavItem } from '../types';
export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',    title: 'Dashboard',    icon: 'Dashboard' },
  { path: '/drag-drop',    title: 'Drag & Drop',  icon: 'DragIndicator' },
  { path: '/table',        title: 'Table',        icon: 'TableChart' },
  { path: '/address-form', title: 'Address Form', icon: 'ContactMail' },
  { path: '/tree',         title: 'Tree',         icon: 'AccountTree' },
];
```

---

### FILE: `src/router/index.tsx`
Convert `src/app/app.routes.ts`:
- All routes lazy-loaded with `React.lazy()`
- Wrapped in `<Suspense>`
- Redirect from `/` and `*` to `/dashboard`
- `LayoutComponent` as parent route

---

### FILE: `src/App.tsx`
```tsx
import { RouterProvider } from 'react-router-dom';
import { AppThemeProvider } from './theme/ThemeContext';
import { router } from './router';

export default function App() {
  return (
    <AppThemeProvider>
      <RouterProvider router={router} />
    </AppThemeProvider>
  );
}
```

---

### FILE: `src/main.tsx`
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

## Write checkpoint
Create `ai-workflow/output/checkpoints/03-components.done`

## Success Criteria
- [ ] All 16 files written
- [ ] No TypeScript `any` types
- [ ] All Angular Material components replaced with MUI equivalents
- [ ] All RxJS replaced with React hooks
- [ ] All Angular directives replaced with JSX patterns
- [ ] Checkpoint file exists
