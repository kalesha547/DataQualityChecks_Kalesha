# Agent 4 — Router Agent

## Role
You are the **Router Agent**. Your job is to convert Angular's lazy-loaded route
configuration to React Router v6 with code splitting and proper navigation metadata.

## Inputs
Read:
- `src/app/app.routes.ts`
- `src/app/protected/dashboard/dashboard.routes.ts`
- `src/app/protected/drag-drop/drag-drop.routes.ts`
- `src/app/protected/table/table.routes.ts`
- `src/app/protected/address-form/address-form.routes.ts`
- `src/app/protected/tree/tree.routes.ts`

## Angular Route Structure (source)
```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard',    data: { title: 'Dashboard', icon: 'dashboard' },    loadChildren: () => import('./protected/dashboard/dashboard.routes') },
      { path: 'drag-drop',    data: { title: 'Drag & Drop', icon: 'drag_handle' },loadChildren: () => import('./protected/drag-drop/drag-drop.routes') },
      { path: 'table',        data: { title: 'Table', icon: 'table_chart' },      loadChildren: () => import('./protected/table/table.routes') },
      { path: 'address-form', data: { title: 'Address Form', icon: 'contact_mail'},loadChildren: () => import('./protected/address-form/address-form.routes') },
      { path: 'tree',         data: { title: 'Tree', icon: 'account_tree' },      loadChildren: () => import('./protected/tree/tree.routes') },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
```

## Steps

### Step 1 — Write `src/router/nav-config.ts`
This replaces Angular's route `data: { title, icon }` metadata:
```typescript
export interface NavItem {
  path: string;
  title: string;
  icon: string; // matches @mui/icons-material export name
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard',    title: 'Dashboard',    icon: 'Dashboard' },
  { path: '/drag-drop',    title: 'Drag & Drop',  icon: 'DragIndicator' },
  { path: '/table',        title: 'Table',        icon: 'TableChart' },
  { path: '/address-form', title: 'Address Form', icon: 'ContactMail' },
  { path: '/tree',         title: 'Tree',         icon: 'AccountTree' },
];
```

### Step 2 — Write `src/router/index.tsx`
Convert ALL Angular routes. Use `React.lazy` for code splitting (equivalent to Angular's `loadChildren`):

```tsx
import { lazy, Suspense, ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import LayoutComponent from '../components/layout/LayoutComponent';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Lazy-loaded pages (equivalent to Angular loadChildren)
const Dashboard    = lazy(() => import('../pages/dashboard/DashboardComponent'));
const DragDrop     = lazy(() => import('../pages/drag-drop/DragDropComponent'));
const Table        = lazy(() => import('../pages/table/TableComponent'));
const AddressForm  = lazy(() => import('../pages/address-form/AddressFormComponent'));
const Tree         = lazy(() => import('../pages/tree/TreeComponent'));

function Lazy({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    }>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    // Redirect bare "/" to "/dashboard" — equivalent to: { path: '', redirectTo: 'dashboard' }
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    // Layout wrapper — equivalent to Angular parent route with LayoutComponent
    path: '/',
    element: <LayoutComponent />,
    children: [
      {
        path: 'dashboard',
        element: <Lazy><Dashboard /></Lazy>,
      },
      {
        path: 'drag-drop',
        element: <Lazy><DragDrop /></Lazy>,
      },
      {
        path: 'table',
        element: <Lazy><Table /></Lazy>,
      },
      {
        path: 'address-form',
        element: <Lazy><AddressForm /></Lazy>,
      },
      {
        path: 'tree',
        element: <Lazy><Tree /></Lazy>,
      },
    ],
  },
  {
    // Wildcard redirect — equivalent to Angular: { path: '**', redirectTo: 'dashboard' }
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
```

### Step 3 — Update `src/App.tsx`
Ensure `RouterProvider` wraps the entire app:
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

### Step 4 — Verify LayoutComponent uses `<Outlet />`
In `src/components/layout/LayoutComponent.tsx`, confirm the main content area renders:
```tsx
import { Outlet } from 'react-router-dom';
// Inside JSX:
<Box component="main" sx={{ flexGrow: 1, p: 3 }}>
  <Outlet />
</Box>
```

### Step 5 — Active link styling
In the sidebar nav, replace Angular's `routerLinkActive="active"` with React Router's `NavLink`:
```tsx
import { NavLink } from 'react-router-dom';

// In the List items:
<ListItemButton
  component={NavLink}
  to={item.path}
  sx={{
    '&.active': {
      backgroundColor: 'action.selected',
      '& .MuiListItemIcon-root': { color: 'primary.main' },
    }
  }}
>
```

### Step 6 — Write checkpoint
Create `ai-workflow/output/checkpoints/04-router.done`

## Angular → React Router Mapping Reference

| Angular | React Router v6 |
|---------|----------------|
| `RouterModule.forRoot(routes)` | `createBrowserRouter(routes)` |
| `<router-outlet>` | `<Outlet />` |
| `routerLink="/path"` | `<Link to="/path">` |
| `routerLinkActive="cls"` | `<NavLink className={({isActive}) => isActive ? 'cls' : ''}>` |
| `loadChildren: () => import(...)` | `lazy(() => import(...))` + `<Suspense>` |
| `{ redirectTo: 'x' }` | `<Navigate to="/x" replace />` |
| `{ path: '**' }` | `{ path: '*' }` |
| `Router.navigate(['/path'])` | `useNavigate()` hook |
| `ActivatedRoute.data` | Route `handle` or custom config (NAV_ITEMS) |
| `PreloadAllModules` | Not needed — React.lazy auto-splits |

## Success Criteria
- [ ] `src/router/nav-config.ts` written with all 5 routes
- [ ] `src/router/index.tsx` written with lazy loading for all 5 pages
- [ ] All redirects match Angular behavior
- [ ] `<Outlet />` used in LayoutComponent
- [ ] `NavLink` used for active link styling
- [ ] Checkpoint file exists
