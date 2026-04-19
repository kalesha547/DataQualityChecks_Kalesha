# Agent 3f — Guards & Resolvers Agent

## Role
Convert Angular route guards (`CanActivate`, `CanDeactivate`, `CanLoad`, `CanMatch`)
and route resolvers to React Router v6 equivalents.

## Inputs
Find all guard and resolver files:
```bash
grep -r "CanActivate\|CanDeactivate\|CanLoad\|CanMatch\|Resolve\b" src/ --include="*.ts" -l
```

## Angular Guard → React Router Mapping

| Angular Guard | React Router v6 Equivalent |
|--------------|---------------------------|
| `CanActivateFn` (auth check) | `<ProtectedRoute>` wrapper component |
| `CanActivateFn` (role check) | `loader` function in route config |
| `CanDeactivateFn` (unsaved changes) | `useBlocker` hook (React Router v6.7+) |
| `CanLoadFn` / `CanMatchFn` | `React.lazy` + conditional render in loader |
| `Resolve` (data prefetch) | `loader` function in route config |
| `ActivatedRoute.data` | `useLoaderData()` hook |
| `Router.navigate()` on guard fail | `redirect()` in loader (React Router v6.4+) |

## Steps

### Step 1 — CanActivate (Auth Guard) → ProtectedRoute component

```typescript
// Angular guard
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// Angular route usage:
{ path: 'dashboard', canActivate: [authGuard], component: DashboardComponent }
```
→
```tsx
// src/components/shared/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
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

// React Router route usage:
{
  path: 'dashboard',
  element: (
    <ProtectedRoute>
      <Suspense fallback={<Loading />}><Dashboard /></Suspense>
    </ProtectedRoute>
  )
}
```

### Step 2 — CanDeactivate (Unsaved changes) → useBlocker

```typescript
// Angular guard
export const unsavedChangesGuard: CanDeactivateFn<AddressFormComponent> = (component) => {
  if (component.form.dirty) {
    return confirm('You have unsaved changes. Leave anyway?');
  }
  return true;
};
```
→
```tsx
// src/hooks/useUnsavedChangesGuard.ts
import { useBlocker } from 'react-router-dom';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  // Show confirmation dialog when blocker is active
  if (blocker.state === 'blocked') {
    return {
      isBlocked: true,
      proceed:   () => blocker.proceed(),
      reset:     () => blocker.reset(),
    };
  }
  return { isBlocked: false, proceed: () => {}, reset: () => {} };
}

// Usage in component:
const { isBlocked, proceed, reset } = useUnsavedChangesGuard(formState.isDirty);
// Render: {isBlocked && <UnsavedChangesDialog onConfirm={proceed} onCancel={reset} />}
```

### Step 3 — Resolve (data prefetch) → React Router loader

```typescript
// Angular resolver
@Injectable({ providedIn: 'root' })
export class UserResolver implements Resolve<User> {
  constructor(private userService: UserService) {}
  resolve(route: ActivatedRouteSnapshot): Observable<User> {
    return this.userService.getUser(route.params['id']);
  }
}
// Angular route: { path: 'user/:id', resolve: { user: UserResolver }, component: UserDetailComponent }
```
→
```typescript
// React Router v6.4+ loader (src/router/index.tsx):
import { redirect } from 'react-router-dom';
import { usersApi } from '../api/users';

async function userLoader({ params }: { params: Record<string, string | undefined> }) {
  const user = await usersApi.getById(params.id!).catch(() => null);
  if (!user) return redirect('/not-found');
  return { user };
}

// Route config:
{ path: 'user/:id', loader: userLoader, element: <UserDetail /> }

// In UserDetail component:
import { useLoaderData } from 'react-router-dom';
function UserDetail() {
  const { user } = useLoaderData() as { user: User };
  return <div>{user.name}</div>;
}
```

### Step 4 — Role-based guard → loader with redirect

```typescript
// Angular role guard
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.hasRole('admin') ? true : new UrlTree(['/unauthorized']);
};
```
→
```typescript
// React Router loader:
function adminLoader() {
  const token = localStorage.getItem('access_token');
  if (!token) return redirect('/login');
  const payload = JSON.parse(atob(token.split('.')[1]));
  if (!payload.roles?.includes('admin')) return redirect('/unauthorized');
  return null;
}
// Route: { path: 'admin', loader: adminLoader, element: <AdminPage /> }
```

### Step 5 — Update `src/router/index.tsx` with guards/loaders

Replace simple route definitions with guarded versions:
```tsx
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <LayoutComponent />,
    children: [
      // Public routes
      { path: 'dashboard', element: <Lazy><Dashboard /></Lazy> },
      // Protected routes (require auth)
      {
        path: 'admin',
        loader: adminLoader,
        element: <Lazy><AdminPage /></Lazy>,
      },
      // Route with CanDeactivate (unsaved changes)
      {
        path: 'address-form',
        element: (
          <ProtectedRoute>
            <Lazy><AddressForm /></Lazy>
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
```

### Step 6 — Write checkpoint
Create `ai-workflow/output/checkpoints/03f-guards.done`

## Success Criteria
- [ ] Every `CanActivateFn` guard has a `<ProtectedRoute>` or `loader` equivalent
- [ ] Every `CanDeactivateFn` guard has a `useBlocker` hook equivalent
- [ ] Every `Resolve` resolver has a `loader` function in the route config
- [ ] `<ProtectedRoute>` component written at `src/components/shared/ProtectedRoute.tsx`
- [ ] No `CanActivate`, `CanDeactivate`, `Resolve`, `ActivatedRouteSnapshot` in converted files
