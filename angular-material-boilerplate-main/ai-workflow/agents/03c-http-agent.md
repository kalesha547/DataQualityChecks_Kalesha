# Agent 3c — HTTP Agent

## Role
Convert all Angular `HttpClient` usage, `HTTP_INTERCEPTORS`, and `HttpClientModule`
to an `axios`-based API layer with React Query or custom hooks.

## Inputs
Search for:
```bash
grep -r "HttpClient\|HttpInterceptor\|HTTP_INTERCEPTORS\|HttpRequest\|HttpHandler\|HttpEvent" src/ --include="*.ts" -l
```

## Angular → React HTTP Mapping

| Angular | React (axios) |
|---------|--------------|
| `HttpClientModule` in imports | `axios` instance in `src/api/client.ts` |
| `HttpClient.get<T>(url)` | `api.get<T>(url)` → returns `Promise<T>` |
| `HttpClient.post<T>(url, body)` | `api.post<T>(url, body)` |
| `HttpClient.put<T>(url, body)` | `api.put<T>(url, body)` |
| `HttpClient.delete<T>(url)` | `api.delete<T>(url)` |
| `Observable<T>` return | `Promise<T>` wrapped in custom hook |
| `HTTP_INTERCEPTORS` | `axios.interceptors.request/response` |
| `HttpHeaders` | `{ headers: { ... } }` in axios config |
| `HttpParams` | `{ params: { ... } }` in axios config |
| `catchError(err => ...)` | `try/catch` in async function |
| Error interceptor | `api.interceptors.response.use(null, handler)` |
| Auth interceptor (add token) | `api.interceptors.request.use(config => {...})` |

## Steps

### Step 1 — Create `src/api/client.ts`
```typescript
import axios from 'axios';
import { environment } from '../config/env';

export const api = axios.create({
  baseURL: environment.apiUrl,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor (replaces Angular JWT interceptor)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Error interceptor (replaces Angular error interceptor)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Step 2 — Convert each HTTP Interceptor
For every `@Injectable` class that implements `HttpInterceptor`:

```typescript
// Angular interceptor
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next.handle(authReq);
  }
}
```
→
```typescript
// Becomes an axios interceptor in src/api/client.ts:
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Interceptor type mapping:**
- Auth token injection → `api.interceptors.request.use`
- Loading spinner show/hide → `api.interceptors.request.use` + `api.interceptors.response.use`
- Error handling / toast → `api.interceptors.response.use(null, handler)`
- Response transform → `api.interceptors.response.use(res => transform(res.data))`
- Retry on failure → `axios-retry` package

### Step 3 — Convert HttpClient calls to resource files
Each Angular service with HttpClient becomes two files:

**`src/api/<resource>.ts`** — pure API functions (no hooks, no state):
```typescript
import { api } from './client';
import type { User } from '../types';

export const usersApi = {
  getAll:   ()            => api.get<User[]>('/users').then(r => r.data),
  getById:  (id: string)  => api.get<User>(`/users/${id}`).then(r => r.data),
  create:   (data: Partial<User>) => api.post<User>('/users', data).then(r => r.data),
  update:   (id: string, data: Partial<User>) => api.put<User>(`/users/${id}`, data).then(r => r.data),
  remove:   (id: string)  => api.delete(`/users/${id}`),
};
```

**`src/hooks/useUsers.ts`** — React hook that wraps the API:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/users';
import type { User } from '../types';

export function useUsers() {
  const [data, setData]       = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await usersApi.getAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
```

### Step 4 — (Optional) Add React Query for advanced cases
If the project has many HTTP calls, replace custom hooks with React Query:
```bash
npm install @tanstack/react-query
```
```typescript
// src/hooks/useUsers.ts (React Query version)
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: usersApi.getAll });
}
// Returns: { data, isLoading, isError, error, refetch }
```

### Step 5 — Add required packages
```json
"axios": "^1.7.7"
```
Optional (if many HTTP calls):
```json
"@tanstack/react-query": "^5.56.2"
```
Optional (retry logic):
```json
"axios-retry": "^4.5.0"
```

### Step 6 — Write checkpoint
Create `ai-workflow/output/checkpoints/03c-http.done`

## Success Criteria
- [ ] `src/api/client.ts` created with axios instance
- [ ] Every Angular interceptor converted to axios interceptor
- [ ] Every HttpClient service has a `src/api/<resource>.ts` counterpart
- [ ] Every data service has a `src/hooks/use<Resource>.ts` counterpart
- [ ] No `Observable`, `HttpClient`, or `HTTP_INTERCEPTORS` remain in converted files
