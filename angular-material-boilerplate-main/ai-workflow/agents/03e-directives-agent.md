# Agent 3e — Directives Agent

## Role
Convert all Angular `@Directive` declarations — both structural and attribute directives —
to React equivalents. React has no directive concept; each directive maps to either
a custom component, a hook, or an inline JSX pattern.

## Inputs
Find all directive files:
```bash
grep -r "@Directive" src/ --include="*.ts" -l
```

## Angular Directive Type → React Pattern

| Directive Type | Angular Example | React Equivalent |
|---------------|----------------|-----------------|
| Structural (changes DOM) | `*ngIf`, `*ngFor`, `*ngSwitch` | JSX conditionals + `.map()` |
| Attribute (changes appearance) | `[appHighlight]`, `[tooltip]` | Custom component wrapper or `sx` prop |
| Component-like directive | `appAutoFocus` | `useRef` + `useEffect` |
| Event-handling directive | `(click)="..."`, `appClickOutside` | `useEffect` with event listener |
| Validator directive | `appEmailValidator` | Zod schema or `validate` option in RHF |

## Built-in Angular Structural Directives

### `*ngIf` / `@if`
```html
<!-- Angular -->
<div *ngIf="isVisible">Content</div>
<div *ngIf="user; else loading">{{ user.name }}</div>
```
```tsx
{/* React */}
{isVisible && <div>Content</div>}
{user ? <div>{user.name}</div> : <Loading />}
```

### `*ngFor` / `@for`
```html
<!-- Angular -->
<li *ngFor="let item of items; trackBy: trackById">{{ item.name }}</li>
```
```tsx
{/* React */}
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

### `*ngSwitch` / `@switch`
```html
<!-- Angular -->
<div [ngSwitch]="status">
  <span *ngSwitchCase="'active'">Active</span>
  <span *ngSwitchCase="'inactive'">Inactive</span>
  <span *ngSwitchDefault>Unknown</span>
</div>
```
```tsx
{/* React */}
{status === 'active'   ? <span>Active</span>
 : status === 'inactive' ? <span>Inactive</span>
 : <span>Unknown</span>}
```

### `*ngTemplateOutlet`
```tsx
// Replace with component composition: pass children or render props
function Layout({ header, children }: { header: ReactNode; children: ReactNode }) {
  return <><div>{header}</div><main>{children}</main></>;
}
```

## Custom Directive Patterns

### Pattern A: Attribute directive → CSS / sx prop
```typescript
// Angular: [appHighlight]="color" directive that sets background
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  @Input() appHighlight = 'yellow';
  @HostBinding('style.backgroundColor') bgColor = this.appHighlight;
}
```
→
```tsx
// React: inline sx prop or className
<Box sx={{ backgroundColor: color }}>...</Box>
// OR extract to a styled component:
const HighlightBox = styled(Box)<{ color?: string }>(({ color }) => ({
  backgroundColor: color ?? 'yellow',
}));
```

### Pattern B: Auto-focus directive → useRef + useEffect
```typescript
// Angular
@Directive({ selector: '[appAutoFocus]' })
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef) {}
  ngAfterViewInit() { this.el.nativeElement.focus(); }
}
```
→
```typescript
// src/hooks/useAutoFocus.ts
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return ref;
}
// Usage: <input ref={useAutoFocus<HTMLInputElement>()} />
```

### Pattern C: Click-outside directive → useEffect event listener
```typescript
// Angular
@Directive({ selector: '[appClickOutside]' })
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();
  @HostListener('document:click', ['$event']) onDocumentClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target)) this.clickOutside.emit();
  }
}
```
→
```typescript
// src/hooks/useClickOutside.ts
export function useClickOutside<T extends HTMLElement>(callback: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) callback();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [callback]);
  return ref;
}
```

### Pattern D: Tooltip directive → MUI Tooltip component
```typescript
// Angular: <button [matTooltip]="'Save changes'">Save</button>
```
```tsx
// React: <Tooltip title="Save changes"><Button>Save</Button></Tooltip>
```

### Pattern E: Permission/role directive → custom component
```typescript
// Angular
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective {
  @Input() appHasRole: string;
  constructor(private authService: AuthService, private template: TemplateRef<unknown>, private viewContainer: ViewContainerRef) {}
  ngOnInit() {
    if (this.authService.hasRole(this.appHasRole)) this.viewContainer.createEmbeddedView(this.template);
    else this.viewContainer.clear();
  }
}
// Usage: <button *appHasRole="'admin'">Delete</button>
```
→
```tsx
// src/components/shared/HasRole.tsx
function HasRole({ role, children }: { role: string; children: ReactNode }) {
  const { user } = useAuth();
  return user?.roles.includes(role) ? <>{children}</> : null;
}
// Usage: <HasRole role="admin"><Button>Delete</Button></HasRole>
```

### Pattern F: Form validator directive → Zod refinement
```typescript
// Angular validator directive
@Directive({ selector: '[appNoSpaces]', providers: [{ provide: NG_VALIDATORS, useExisting: NoSpacesDirective, multi: true }] })
export class NoSpacesDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    return /\s/.test(control.value) ? { noSpaces: true } : null;
  }
}
```
→
```typescript
// Zod custom refinement in schema
const schema = z.object({
  username: z.string().refine(v => !/\s/.test(v), { message: 'No spaces allowed' }),
});
```

## Output File Locations
- `@HostListener` event directives → `src/hooks/use<Name>.ts`
- DOM manipulation directives → `src/hooks/use<Name>.ts`
- Permission/structural directives → `src/components/shared/<Name>.tsx`
- Validator directives → Zod refinements in `src/pages/<feature>/<feature>.schema.ts`
- Style directives → inline `sx` prop or styled components

## Write checkpoint
Create `ai-workflow/output/checkpoints/03e-directives.done`

## Success Criteria
- [ ] All structural directives replaced with JSX conditionals
- [ ] Custom DOM directives converted to custom hooks in `src/hooks/`
- [ ] Permission/role directives converted to wrapper components
- [ ] Validator directives converted to Zod `.refine()` rules
- [ ] No `@Directive`, `TemplateRef`, `ViewContainerRef`, or `ElementRef` in converted files
