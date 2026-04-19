# Agent 3h — Advanced Forms Agent

## Role
Convert Angular `FormArray`, nested `FormGroup`, dynamic form controls,
and custom validator directives — patterns NOT covered by the basic form agent (06).

## Inputs
Search for advanced form patterns:
```bash
grep -r "FormArray\|FormGroup\|addControl\|removeControl\|setControl\|FormBuilder.array" src/ --include="*.ts" -l
```

## Angular Advanced Form → React Hook Form Mapping

| Angular | React Hook Form |
|---------|----------------|
| `FormArray` | `useFieldArray` hook |
| Nested `FormGroup` | Nested `useForm` or field path `'address.street'` |
| `fb.array([fb.group({...})])` | `useFieldArray` with `append(defaultValues)` |
| `formArray.push(newGroup)` | `append(newItem)` |
| `formArray.removeAt(i)` | `remove(i)` |
| `formArray.at(i).get('field')` | `fields[i].fieldName` or `register('items.${i}.name')` |
| Dynamic `addControl` | `setValue` + `register` |
| Async validators | `validate: async (v) => await checkApi(v) ? undefined : 'error'` |
| Cross-field validators | Zod `.superRefine()` or `schema.refine()` |

## Step 1 — FormArray → useFieldArray

```typescript
// Angular
@Component(...)
export class OrderFormComponent {
  form = this.fb.group({
    customerName: ['', Validators.required],
    items: this.fb.array([
      this.fb.group({ product: ['', Validators.required], quantity: [1, Validators.min(1)] })
    ])
  });
  get items() { return this.form.get('items') as FormArray; }
  addItem()   { this.items.push(this.fb.group({ product: [''], quantity: [1] })); }
  removeItem(i: number) { this.items.removeAt(i); }
}
```
→
```typescript
// React
const orderSchema = z.object({
  customerName: z.string().min(1, 'Required'),
  items: z.array(z.object({
    product:  z.string().min(1, 'Product required'),
    quantity: z.number().min(1, 'Min 1'),
  })).min(1, 'At least one item required'),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export function OrderFormComponent() {
  const { register, control, handleSubmit, formState: { errors } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customerName: '', items: [{ product: '', quantity: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <TextField label="Customer" {...register('customerName')} error={!!errors.customerName} helperText={errors.customerName?.message} />

      {fields.map((field, index) => (
        <Box key={field.id} sx={{ display: 'flex', gap: 2, mb: 1 }}>
          <TextField
            label="Product"
            {...register(`items.${index}.product`)}
            error={!!errors.items?.[index]?.product}
            helperText={errors.items?.[index]?.product?.message}
          />
          <TextField
            label="Quantity"
            type="number"
            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
            error={!!errors.items?.[index]?.quantity}
            helperText={errors.items?.[index]?.quantity?.message}
          />
          <Button onClick={() => remove(index)} color="error">Remove</Button>
        </Box>
      ))}

      <Button onClick={() => append({ product: '', quantity: 1 })}>Add Item</Button>
      <Button type="submit" variant="contained">Submit</Button>
    </form>
  );
}
```

## Step 2 — Nested FormGroup → nested Zod + RHF field paths

```typescript
// Angular
form = this.fb.group({
  personal: this.fb.group({ firstName: [''], lastName: [''] }),
  address:  this.fb.group({ street: [''], city: [''], zip: [''] }),
});
```
→
```typescript
const schema = z.object({
  personal: z.object({ firstName: z.string().min(1), lastName: z.string().min(1) }),
  address:  z.object({ street: z.string().min(1), city: z.string().min(1), zip: z.string().length(5) }),
});

// Field registration uses dot-path:
<TextField {...register('personal.firstName')} error={!!errors.personal?.firstName} />
<TextField {...register('address.street')}     error={!!errors.address?.street} />
```

## Step 3 — Async validators → Zod async refinements or RHF validate option

```typescript
// Angular async validator
export function uniqueEmailValidator(userService: UserService): AsyncValidatorFn {
  return control => control.valueChanges.pipe(
    debounceTime(400),
    switchMap(email => userService.checkEmailExists(email)),
    map(exists => exists ? { emailTaken: true } : null),
    first()
  );
}
```
→
```typescript
// React Hook Form async validate option:
<TextField
  {...register('email', {
    validate: async value => {
      const exists = await checkEmailExists(value);
      return exists ? 'Email already taken' : true;
    }
  })}
/>
// OR Zod async refinement:
const schema = z.object({
  email: z.string().email().superRefine(async (email, ctx) => {
    const exists = await checkEmailExists(email);
    if (exists) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email already taken' });
  }),
});
```

## Step 4 — Cross-field validators → Zod .superRefine

```typescript
// Angular: passwords must match
form = this.fb.group({
  password: [''],
  confirmPassword: ['']
}, { validators: passwordMatchValidator });

function passwordMatchValidator(g: AbstractControl) {
  return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
}
```
→
```typescript
// Zod superRefine
const schema = z.object({
  password:        z.string().min(8),
  confirmPassword: z.string(),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password !== confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Passwords must match', path: ['confirmPassword'] });
  }
});
```

## Write checkpoint
Create `ai-workflow/output/checkpoints/03h-forms-advanced.done`

## Success Criteria
- [ ] All `FormArray` converted to `useFieldArray`
- [ ] All nested `FormGroup` converted to nested Zod objects with dot-path registration
- [ ] All async validators converted to `validate` option or async Zod refinements
- [ ] All cross-field validators converted to `z.superRefine()`
- [ ] No `FormArray`, `FormBuilder.array`, `removeAt`, `formGroup.get().get()` in converted files
