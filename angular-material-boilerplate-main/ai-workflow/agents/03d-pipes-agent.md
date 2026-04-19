# Agent 3d — Pipes Agent

## Role
Convert all Angular `@Pipe` declarations to React-compatible utility functions,
component helpers, or `Intl`-based formatters. Angular pipes are used in templates
as `{{ value | pipeName:arg }}` — in React these become plain function calls in JSX.

## Inputs
Find all pipe files:
```bash
grep -r "@Pipe" src/ --include="*.ts" -l
```

## Angular Built-in Pipe → React Mapping

| Angular Pipe | Usage | React Equivalent |
|-------------|-------|-----------------|
| `date:'short'` | `{{ date \| date:'short' }}` | `new Intl.DateTimeFormat('en-US', {...}).format(date)` or `format(date, 'MM/dd/yy')` from date-fns |
| `date:'longDate'` | `{{ date \| date:'longDate' }}` | `format(date, 'MMMM d, y')` (date-fns) |
| `currency:'USD'` | `{{ price \| currency }}` | `new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(price)` |
| `number:'1.2-2'` | `{{ n \| number:'1.2-2' }}` | `new Intl.NumberFormat('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(n)` |
| `percent` | `{{ n \| percent }}` | `new Intl.NumberFormat('en-US', { style:'percent' }).format(n)` |
| `uppercase` | `{{ str \| uppercase }}` | `str.toUpperCase()` |
| `lowercase` | `{{ str \| lowercase }}` | `str.toLowerCase()` |
| `titlecase` | `{{ str \| titlecase }}` | `str.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase())` |
| `slice:0:5` | `{{ arr \| slice:0:5 }}` | `arr.slice(0, 5)` |
| `json` | `{{ obj \| json }}` | `JSON.stringify(obj, null, 2)` |
| `async` | `{{ obs$ \| async }}` | `useState` + `useEffect` subscription |
| `keyvalue` | `{{ obj \| keyvalue }}` | `Object.entries(obj).map(([k, v]) => ...)` |
| `i18nPlural` | `{{ n \| i18nPlural:map }}` | conditional expression |

## Steps

### Step 1 — Identify all built-in pipe usages
Scan all `.html` template files for `| pipeName` patterns:
```bash
grep -r "| date\|| currency\|| number\|| percent\|| slice\|| async\|| uppercase\|| lowercase\|| titlecase\|| json\|| keyvalue" src/ --include="*.html"
```

Replace each occurrence inline in JSX as a function call.

### Step 2 — Create `src/utils/formatters.ts` for built-in pipes
```typescript
// src/utils/formatters.ts

/** Replaces Angular DatePipe */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' | 'shortDate' | 'longDate' = 'medium'
): string {
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

/** Replaces Angular CurrencyPipe */
export function formatCurrency(
  value: number,
  currencyCode = 'USD',
  locale = 'en-US'
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(value);
}

/** Replaces Angular DecimalPipe e.g. '1.2-3' → min 2, max 3 fraction digits */
export function formatNumber(value: number, digitsInfo = '1.0-3'): string {
  const [, frac = '0-3'] = digitsInfo.split('.');
  const [min, max] = frac.split('-').map(Number);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: min ?? 0,
    maximumFractionDigits: max ?? 3,
  }).format(value);
}

/** Replaces Angular PercentPipe */
export function formatPercent(value: number, digitsInfo = '1.0-0'): string {
  const [, frac = '0-0'] = digitsInfo.split('.');
  const [min, max] = frac.split('-').map(Number);
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: min ?? 0,
    maximumFractionDigits: max ?? 0,
  }).format(value);
}

/** Replaces Angular TitleCasePipe */
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

/** Replaces Angular SlicePipe */
export function slicePipe<T>(arr: T[] | string, start: number, end?: number): T[] | string {
  return arr.slice(start, end);
}

/** Replaces Angular KeyValuePipe */
export function keyValuePairs<T>(obj: Record<string, T>): Array<{ key: string; value: T }> {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}
```

### Step 3 — Convert async pipe
The `async` pipe subscribes to an Observable/Promise. Replace with `useState` + `useEffect`:

```typescript
// Angular template: {{ data$ | async }}
// Angular component: data$ = this.service.getData();

// React equivalent:
function MyComponent() {
  const [data, setData] = useState<DataType | null>(null);
  useEffect(() => {
    const sub = dataService.getData().subscribe(setData);
    return () => sub.unsubscribe(); // cleanup
  }, []);
  return <div>{data}</div>;
}
```

### Step 4 — Convert custom pipes
For each `@Pipe()` class found:

```typescript
// Angular custom pipe
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 100): string {
    return value.length > limit ? value.slice(0, limit) + '…' : value;
  }
}
```
→
```typescript
// src/utils/truncate.ts
export function truncate(value: string, limit = 100): string {
  return value.length > limit ? value.slice(0, limit) + '\u2026' : value;
}
```
Usage in JSX: `<span>{truncate(text, 50)}</span>`

### Step 5 — In-template pipe usage → JSX conversion

| Angular template | React JSX |
|-----------------|-----------|
| `{{ price \| currency }}` | `{formatCurrency(price)}` |
| `{{ date \| date:'shortDate' }}` | `{formatDate(date, 'shortDate')}` |
| `{{ name \| uppercase }}` | `{name.toUpperCase()}` |
| `{{ items \| slice:0:3 }}` | `{items.slice(0, 3).map(...)}` |
| `{{ n \| number:'1.2-2' }}` | `{formatNumber(n, '1.2-2')}` |
| `*ngFor="let item of list \| async"` | `const { data: list } = useQuery(...)` |

### Step 6 — Write checkpoint
Create `ai-workflow/output/checkpoints/03d-pipes.done`

## Success Criteria
- [ ] `src/utils/formatters.ts` created with all built-in pipe equivalents
- [ ] Custom pipes converted to functions in `src/utils/`
- [ ] All `| async` pipes replaced with React hooks
- [ ] No `PipeTransform` or `@Pipe` in converted files
- [ ] Template `| pipeName` usages replaced with inline function calls
