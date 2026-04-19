# Agent 3b — Services Agent

## Role
Convert every Angular `@Injectable` service to its React equivalent.
The conversion strategy depends on what the service does:

| Angular Service Type | React Equivalent |
|---------------------|-----------------|
| State-holding service (BehaviorSubject) | Zustand store slice OR React Context |
| Stateless utility service | Plain TypeScript module / utility functions |
| HTTP data service | Custom hook (`useXxx`) that calls `api/` functions |
| Auth/session service | React Context + custom hook |
| Singleton config/env service | Module-level constant (`src/config/`) |
| Event bus (Subject) | Zustand event emitter OR mitt library |

## Inputs
Find all `@Injectable()` files:
```bash
grep -r "@Injectable" src/ --include="*.ts" -l
```

## Steps

### Step 1 — Catalog every service
For each `*.service.ts` file, extract:
- Class name and selector
- Constructor injected dependencies
- Public methods and their return types
- Observable properties (BehaviorSubject, Subject, ReplaySubject)
- HttpClient usage (yes/no)

### Step 2 — Classify and convert

#### Pattern A: Data/HTTP Service → Custom Hook
```typescript
// Angular
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }
}
```
→
```typescript
// src/api/users.ts  (pure fetch function)
export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<User[]>('/users');
  return res.data;
}

// src/hooks/useUsers.ts  (React hook)
export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { users, loading, error };
}
```

#### Pattern B: State Service (BehaviorSubject) → Zustand Store
```typescript
// Angular
@Injectable({ providedIn: 'root' })
export class CartService {
  private items$ = new BehaviorSubject<CartItem[]>([]);
  items = this.items$.asObservable();

  add(item: CartItem) { this.items$.next([...this.items$.value, item]); }
  remove(id: string)  { this.items$.next(this.items$.value.filter(i => i.id !== id)); }
}
```
→
```typescript
// src/store/cartStore.ts
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  add:    (item: CartItem) => void;
  remove: (id: string) => void;
}

export const useCartStore = create<CartState>(set => ({
  items:  [],
  add:    item => set(s => ({ items: [...s.items, item] })),
  remove: id   => set(s => ({ items: s.items.filter(i => i.id !== id) })),
}));
```

#### Pattern C: Auth Service → Context
```typescript
// src/context/AuthContext.tsx
interface AuthContextValue {
  user: User | null;
  login:  (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
export const AuthContext = createContext<AuthContextValue>(...);
export function AuthProvider({ children }: { children: ReactNode }) { ... }
export const useAuth = () => useContext(AuthContext);
```

#### Pattern D: Utility Service (no state, no HTTP) → Plain module
```typescript
// Angular
@Injectable() export class FormatService {
  formatCurrency(n: number): string { return `$${n.toFixed(2)}`; }
}
```
→
```typescript
// src/utils/format.ts
export function formatCurrency(n: number): string { return `$${n.toFixed(2)}`; }
```

### Step 3 — Remove all `providedIn: 'root'` / `providers:[]` references
There is no DI container in React. All services that were injected in constructors
are now imported directly:
```typescript
// Angular: constructor(private userService: UserService) {}
// React:   import { useUsers } from '../hooks/useUsers';
//          const { users } = useUsers();
```

### Step 4 — Output file locations
- HTTP services    → `src/api/<resource>.ts` + `src/hooks/use<Resource>.ts`
- State services   → `src/store/<feature>Store.ts`
- Auth service     → `src/context/AuthContext.tsx`
- Utility services → `src/utils/<name>.ts`

### Step 5 — Required new packages
Add to `package.json` if state services exist:
```json
"zustand": "^4.5.5"
```
Add if event bus pattern found:
```json
"mitt": "^3.0.1"
```

### Step 6 — Write checkpoint
Create `ai-workflow/output/checkpoints/03b-services.done`

## Success Criteria
- [ ] Every `@Injectable` service has a React equivalent
- [ ] No Angular DI patterns remain in converted files
- [ ] HTTP services use `src/api/` + custom hook pattern
- [ ] State services use Zustand stores
- [ ] Utility services are plain TypeScript functions
