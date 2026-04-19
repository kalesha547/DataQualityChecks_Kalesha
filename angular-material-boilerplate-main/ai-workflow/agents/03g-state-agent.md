# Agent 3g — State Management Agent

## Role
Detect and convert Angular state management patterns (NgRx, Akita, NgXs, or
BehaviorSubject-based service state) to React equivalents.
Choose the target library based on project complexity.

## Inputs
Detect which state pattern is used:
```bash
# NgRx
grep -r "@ngrx/store\|createAction\|createReducer\|createEffect\|createSelector" package.json src/

# Akita
grep -r "@datorama/akita\|EntityStore\|Query\b" package.json src/

# NgXs
grep -r "@ngxs/store\|@State\|@Action\b" package.json src/

# Manual BehaviorSubject state
grep -r "BehaviorSubject\|new BehaviorSubject" src/ --include="*.service.ts"
```

## State Library Decision Matrix

| Angular Pattern | Project Scale | React Equivalent |
|----------------|--------------|-----------------|
| `BehaviorSubject` in services | Small (<5 state slices) | Zustand |
| NgRx (actions/reducers/effects) | Medium-Large | Zustand OR Redux Toolkit |
| Akita (EntityStore) | Entity-heavy | Zustand + normalized state |
| NgXs (class-based actions) | Any | Redux Toolkit |
| Simple component `@Input/@Output` | Tiny | `useState` / `useReducer` |

---

## Pattern A: NgRx → Redux Toolkit

### Angular NgRx source structure:
```
store/
  actions/user.actions.ts      → createAction('loadUsers')
  reducers/user.reducer.ts     → createReducer(initialState, on(...))
  effects/user.effects.ts      → createEffect(() => actions$.pipe(ofType, switchMap...))
  selectors/user.selectors.ts  → createSelector(feature, state => state.users)
```

### Converted Redux Toolkit structure:
```
src/store/
  userSlice.ts    ← actions + reducer combined
  userThunks.ts   ← async effects → createAsyncThunk
  store.ts        ← configureStore root
  hooks.ts        ← typed useAppDispatch + useAppSelector
```

**`src/store/store.ts`:**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from './userSlice';

export const store = configureStore({
  reducer: { users: userReducer },
});

export type RootState    = ReturnType<typeof store.getState>;
export type AppDispatch  = typeof store.dispatch;
```

**`src/store/hooks.ts`:**
```typescript
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**NgRx actions + reducer → Redux Toolkit slice:**
```typescript
// Angular NgRx
export const loadUsers  = createAction('[Users] Load');
export const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>());
export const usersReducer = createReducer(
  { users: [], loading: false },
  on(loadUsers, s => ({ ...s, loading: true })),
  on(loadUsersSuccess, (s, { users }) => ({ ...s, users, loading: false }))
);
```
→
```typescript
// Redux Toolkit slice
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { usersApi } from '../api/users';

export const loadUsers = createAsyncThunk('users/load', usersApi.getAll);

const userSlice = createSlice({
  name: 'users',
  initialState: { users: [] as User[], loading: false, error: null as string | null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadUsers.pending,   s => { s.loading = true; })
      .addCase(loadUsers.fulfilled, (s, { payload }) => { s.users = payload; s.loading = false; })
      .addCase(loadUsers.rejected,  (s, { error }) => { s.loading = false; s.error = error.message ?? null; });
  },
});

export const userReducer = userSlice.reducer;
```

**NgRx Effects → createAsyncThunk** (shown above) or side-effect middleware.

**NgRx Selectors → useAppSelector:**
```typescript
// Angular selector
export const selectUsers     = createSelector(selectUsersFeature, s => s.users);
export const selectLoading   = createSelector(selectUsersFeature, s => s.loading);

// React equivalent
const users  = useAppSelector(s => s.users.users);
const loading = useAppSelector(s => s.users.loading);
```

---

## Pattern B: BehaviorSubject services → Zustand

```typescript
// Angular
@Injectable({ providedIn: 'root' })
export class CartService {
  private cart$ = new BehaviorSubject<CartItem[]>([]);
  cart = this.cart$.asObservable();
  addItem(item: CartItem)  { this.cart$.next([...this.cart$.value, item]); }
  removeItem(id: string)   { this.cart$.next(this.cart$.value.filter(i => i.id !== id)); }
  clearCart()              { this.cart$.next([]); }
  get total()              { return this.cart$.value.reduce((s, i) => s + i.price, 0); }
}
```
→
```typescript
// src/store/cartStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CartState {
  items:      CartItem[];
  addItem:    (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart:  () => void;
  total:      () => number;
}

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        items:      [],
        addItem:    item => set(s => ({ items: [...s.items, item] })),
        removeItem: id   => set(s => ({ items: s.items.filter(i => i.id !== id) })),
        clearCart:  ()   => set({ items: [] }),
        total:      ()   => get().items.reduce((s, i) => s + i.price, 0),
      }),
      { name: 'cart-storage' }  // persists to localStorage
    )
  )
);
```

---

## Pattern C: Akita EntityStore → Zustand with normalization

```typescript
// src/store/<entity>Store.ts using normalization
import { create } from 'zustand';

interface EntityState<T extends { id: string }> {
  ids:      string[];
  entities: Record<string, T>;
  loading:  boolean;
  error:    string | null;
}

function createEntityStore<T extends { id: string }>(name: string) {
  return create<EntityState<T> & {
    setAll:    (items: T[]) => void;
    upsert:    (item: T)    => void;
    remove:    (id: string) => void;
    selectAll: () => T[];
  }>()(set => ({
    ids: [], entities: {}, loading: false, error: null,
    setAll: items => set({
      ids:      items.map(i => i.id),
      entities: Object.fromEntries(items.map(i => [i.id, i])),
    }),
    upsert: item => set(s => ({
      ids:      s.ids.includes(item.id) ? s.ids : [...s.ids, item.id],
      entities: { ...s.entities, [item.id]: item },
    })),
    remove: id => set(s => ({
      ids:      s.ids.filter(i => i !== id),
      entities: Object.fromEntries(Object.entries(s.entities).filter(([k]) => k !== id)),
    })),
    selectAll: () => { const s = get(); return s.ids.map(id => s.entities[id]!); },
  }));
}
```

---

## Step: Wire the store into the React app

**For Redux Toolkit**, wrap the app with `<Provider store={store}>`:
```tsx
// src/main.tsx
import { Provider } from 'react-redux';
import { store } from './store/store';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
```

**For Zustand**, no provider needed — use `useCartStore()` directly in any component.

## Required Packages

NgRx → Redux Toolkit:
```json
"@reduxjs/toolkit": "^2.2.7",
"react-redux": "^9.1.2"
```

BehaviorSubject state → Zustand:
```json
"zustand": "^4.5.5"
```

## Write checkpoint
Create `ai-workflow/output/checkpoints/03g-state.done`

## Success Criteria
- [ ] State pattern detected and appropriate library chosen
- [ ] Every NgRx action/reducer/effect converted to Redux Toolkit slice + thunk
- [ ] Every BehaviorSubject service converted to Zustand store
- [ ] Every NgRx selector converted to `useAppSelector` call
- [ ] `<Provider>` added to `main.tsx` if Redux Toolkit used
- [ ] No `createAction`, `createReducer`, `on()`, `@Effect`, `ofType` in converted files
