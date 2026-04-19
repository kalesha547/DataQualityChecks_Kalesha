# Agent 6 — Form Agent

## Role
You are the **Form Agent**. Your sole responsibility is converting the Angular
Reactive Form (`AddressFormComponent`) to React Hook Form + Zod with full validation.
This is the most complex component conversion and gets its own dedicated agent.

## Inputs
Read these files completely before writing anything:
- `src/app/protected/address-form/address-form.component.ts`
- `src/app/protected/address-form/address-form.component.html`

## Angular Source Analysis

### Form Controls (extract from Angular source)
The Angular component uses `FormBuilder.group()` with these controls:
```
company, firstName, lastName, address, address2, city, state, postalCode, shipping
```

### US States (extract from Angular source)
The Angular component has a `states` array with all 50 US states. Copy them exactly.

### Validation Rules (extract from Angular source)
Identify which fields have `Validators.required` and other validators.

---

## Steps

### Step 1 — Read the Angular address-form component files
Carefully read and understand:
1. All `FormControl` definitions and their validators
2. The complete HTML template structure
3. All `mat-form-field`, `mat-select`, `mat-radio-group` usages
4. The submit handler
5. The US states array

### Step 2 — Write `src/pages/address-form/addressForm.schema.ts`
Create a Zod schema that matches all Angular validators:

```typescript
import { z } from 'zod';

// Copy all 50 states exactly from Angular source
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
] as const;

export const SHIPPING_OPTIONS = ['free', 'standard', 'express'] as const;

export const addressFormSchema = z.object({
  company:    z.string().optional().or(z.literal('')),
  firstName:  z.string().min(1, 'First name is required'),
  lastName:   z.string().min(1, 'Last name is required'),
  address:    z.string().min(1, 'Address line 1 is required'),
  address2:   z.string().optional().or(z.literal('')),
  city:       z.string().min(1, 'City is required'),
  state:      z.string().min(1, 'State is required'),
  postalCode: z.string()
    .min(1, 'Postal code is required')
    .regex(/^\d{5}(-\d{4})?$/, 'Enter a valid US postal code'),
  shipping:   z.enum(SHIPPING_OPTIONS, {
    errorMap: () => ({ message: 'Shipping method is required' }),
  }),
});

export type AddressFormValues = z.infer<typeof addressFormSchema>;
```

### Step 3 — Write `src/pages/address-form/AddressFormComponent.tsx`
Full conversion maintaining identical UI structure to the Angular template:

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import FormLabel from '@mui/material/FormLabel';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  addressFormSchema,
  AddressFormValues,
  US_STATES,
  SHIPPING_OPTIONS,
} from './addressForm.schema';

export default function AddressFormComponent() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid, isSubmitSuccessful },
    reset,
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    mode: 'onTouched', // match Angular's touched-based error display
    defaultValues: {
      company: '',
      firstName: '',
      lastName: '',
      address: '',
      address2: '',
      city: '',
      state: '',
      postalCode: '',
      shipping: undefined,
    },
  });

  const onSubmit = (data: AddressFormValues) => {
    console.log('Form submitted:', data);
    // Replace with actual API call
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      <Card>
        <CardHeader title="Shipping information" />
        <CardContent>
          <Box
            component="form"
            id="address-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Grid container spacing={2}>

              {/* Company */}
              <Grid item xs={12}>
                <TextField
                  label="Company"
                  fullWidth
                  {...register('company')}
                  error={!!errors.company}
                  helperText={errors.company?.message}
                />
              </Grid>

              {/* First Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First name"
                  fullWidth
                  required
                  {...register('firstName')}
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                />
              </Grid>

              {/* Last Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last name"
                  fullWidth
                  required
                  {...register('lastName')}
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                />
              </Grid>

              {/* Address Line 1 */}
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  fullWidth
                  required
                  {...register('address')}
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              </Grid>

              {/* Address Line 2 */}
              <Grid item xs={12}>
                <TextField
                  label="Address 2"
                  fullWidth
                  {...register('address2')}
                  error={!!errors.address2}
                  helperText={errors.address2?.message}
                />
              </Grid>

              {/* City */}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  required
                  {...register('city')}
                  error={!!errors.city}
                  helperText={errors.city?.message}
                />
              </Grid>

              {/* State */}
              <Grid item xs={12} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth required error={!!errors.state}>
                      <InputLabel id="state-label">State</InputLabel>
                      <Select labelId="state-label" label="State" {...field}>
                        {US_STATES.map(s => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                      </Select>
                      {errors.state && (
                        <FormHelperText>{errors.state.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

              {/* Postal Code */}
              <Grid item xs={12} sm={2}>
                <TextField
                  label="Zip"
                  fullWidth
                  required
                  {...register('postalCode')}
                  error={!!errors.postalCode}
                  helperText={errors.postalCode?.message}
                />
              </Grid>

              {/* Shipping Method */}
              <Grid item xs={12}>
                <Controller
                  name="shipping"
                  control={control}
                  render={({ field }) => (
                    <FormControl error={!!errors.shipping}>
                      <FormLabel>Shipping</FormLabel>
                      <RadioGroup row {...field}>
                        {SHIPPING_OPTIONS.map(opt => (
                          <FormControlLabel
                            key={opt}
                            value={opt}
                            control={<Radio />}
                            label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                          />
                        ))}
                      </RadioGroup>
                      {errors.shipping && (
                        <FormHelperText>{errors.shipping.message}</FormHelperText>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>

            </Grid>
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
          <Button variant="outlined" onClick={() => reset()}>
            Clear
          </Button>
          <Button
            type="submit"
            form="address-form"
            variant="contained"
            disabled={!isValid}
          >
            Next
          </Button>
        </CardActions>
      </Card>

      {isSubmitSuccessful && (
        <Typography color="success.main" sx={{ mt: 2, textAlign: 'center' }}>
          Form submitted successfully!
        </Typography>
      )}
    </Box>
  );
}
```

### Step 4 — Write checkpoint
Create `ai-workflow/output/checkpoints/06-forms.done`

## Angular Forms → React Hook Form Mapping

| Angular | React Hook Form + Zod |
|---------|----------------------|
| `FormBuilder.group({...})` | `useForm({ resolver: zodResolver(schema) })` |
| `Validators.required` | `z.string().min(1, 'message')` |
| `Validators.pattern(regex)` | `z.string().regex(regex, 'message')` |
| `Validators.email` | `z.string().email('message')` |
| `Validators.minLength(n)` | `z.string().min(n, 'message')` |
| `[formControlName]="name"` | `{...register('name')}` |
| `[formControl]="control"` | `<Controller name="..." control={control} render={...} />` |
| `formGroup.get('x').invalid && touched` | `!!errors.x` (after `mode: 'onTouched'`) |
| `<mat-error>{{ msg }}</mat-error>` | `helperText={errors.x?.message} error={!!errors.x}` |
| `formGroup.valid` | `formState.isValid` |
| `form.reset()` | `reset()` |
| `FormControl.setValue()` | `setValue('field', value)` |

## Success Criteria
- [ ] `addressForm.schema.ts` written with all 50 US states
- [ ] All 9 form fields implemented
- [ ] Zod validation mirrors all Angular `Validators`
- [ ] Error messages display after field is touched (mode: 'onTouched')
- [ ] Submit button disabled when form is invalid
- [ ] Clear/Reset button works
- [ ] `Controller` used for Select and RadioGroup (non-standard inputs)
- [ ] No `any` types
- [ ] Checkpoint file exists
