# Agent 7 — Test Agent

## Role
You are the **Test Agent**. Convert all 8 Angular Karma/Jasmine spec files to
Vitest + React Testing Library. Maintain test coverage parity with the original specs.

## Inputs
Read all Angular spec files:
- `src/app/app.component.spec.ts`
- `src/app/layout/layout/layout.component.spec.ts`
- `src/app/protected/dashboard/dashboard.component.spec.ts`
- `src/app/protected/drag-drop/drag-drop.component.spec.ts`
- `src/app/protected/table/table.component.spec.ts`
- `src/app/protected/address-form/address-form.component.spec.ts`
- `src/app/protected/tree/tree.component.spec.ts`
- `src/app/shared/components/theme-toggle/theme-toggle.component.spec.ts`

Also read the converted React component files to understand what to test.

## Framework Mapping

| Jasmine/Karma | Vitest + RTL |
|--------------|-------------|
| `TestBed.configureTestingModule` | `render(<Component />)` from RTL |
| `TestBed.createComponent(C)` | `render(<C />)` |
| `fixture.detectChanges()` | Not needed |
| `fixture.componentInstance` | Use `screen` queries |
| `compiled.querySelector(sel)` | `screen.getByRole(...)` or `screen.getByText(...)` |
| `spyOn(service, 'method')` | `vi.spyOn(module, 'method')` |
| `jasmine.createSpy()` | `vi.fn()` |
| `expect(x).toBeTruthy()` | `expect(x).toBeTruthy()` ← same |
| `expect(x).toContain(y)` | `expect(x).toContain(y)` ← same |
| `expect(el.textContent).toContain` | `expect(screen.getByText('...')).toBeInTheDocument()` |
| `fakeAsync / tick` | `async/await` with `await waitFor(...)` |
| `HttpClientTestingModule` | `vi.mock('...')` or `msw` (if needed) |

## Steps

### Step 1 — Ensure `src/test-setup.ts` is correct
```typescript
import '@testing-library/jest-dom';
```

### Step 2 — Ensure `vite.config.ts` has test setup
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test-setup.ts',
  css: true,
}
```

### Step 3 — Write `src/App.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppThemeProvider } from './theme/ThemeContext';

// Test that app renders without crashing
describe('App', () => {
  it('renders without crashing', () => {
    // App uses RouterProvider internally, test the providers directly
    const { container } = render(
      <AppThemeProvider>
        <div>App loaded</div>
      </AppThemeProvider>
    );
    expect(container).toBeTruthy();
  });
});
```

### Step 4 — Write `src/components/shared/ThemeToggle.test.tsx`
Convert from Angular spec. Test:
1. Renders a button
2. Button has accessible label
3. Clicking toggles the icon
4. Clicking calls toggleTheme from context

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { ThemeContext } from '../../theme/ThemeContext';
import { createTheme, ThemeProvider } from '@mui/material/styles';

function renderWithTheme(ui: React.ReactElement, mode: 'light' | 'dark' = 'light', toggleFn = vi.fn()) {
  return render(
    <ThemeContext.Provider value={{ mode, toggleTheme: toggleFn }}>
      <ThemeProvider theme={createTheme({ palette: { mode } })}>
        {ui}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

describe('ThemeToggle', () => {
  it('renders a toggle button', () => {
    renderWithTheme(<ThemeToggle />);
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
  });

  it('calls toggleTheme when clicked', () => {
    const toggleFn = vi.fn();
    renderWithTheme(<ThemeToggle />, 'light', toggleFn);
    fireEvent.click(screen.getByRole('button'));
    expect(toggleFn).toHaveBeenCalledOnce();
  });

  it('shows brightness4 icon in light mode', () => {
    renderWithTheme(<ThemeToggle />, 'light');
    // Brightness4Icon is shown in light mode (to switch to dark)
    expect(screen.getByTestId('Brightness4Icon')).toBeInTheDocument();
  });

  it('shows brightness7 icon in dark mode', () => {
    renderWithTheme(<ThemeToggle />, 'dark');
    expect(screen.getByTestId('Brightness7Icon')).toBeInTheDocument();
  });
});
```

### Step 5 — Write `src/components/layout/LayoutComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ThemeContext } from '../../theme/ThemeContext';
import LayoutComponent from './LayoutComponent';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ThemeContext.Provider value={{ mode: 'light', toggleTheme: () => {} }}>
        <ThemeProvider theme={createTheme()}>
          <LayoutComponent />
        </ThemeProvider>
      </ThemeContext.Provider>
    </MemoryRouter>
  );
}

describe('LayoutComponent', () => {
  it('renders without crashing', () => {
    const { container } = renderLayout();
    expect(container).toBeTruthy();
  });

  it('renders navigation items', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Tree')).toBeInTheDocument();
  });

  it('renders app bar', () => {
    renderLayout();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
```

### Step 6 — Write `src/pages/dashboard/DashboardComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import DashboardComponent from './DashboardComponent';

describe('DashboardComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ThemeProvider theme={createTheme()}>
        <DashboardComponent />
      </ThemeProvider>
    );
    expect(container).toBeTruthy();
  });

  it('renders dashboard cards', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <DashboardComponent />
      </ThemeProvider>
    );
    // Should render 4 cards
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThan(0);
  });
});
```

### Step 7 — Write `src/pages/drag-drop/DragDropComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DragDropComponent from './DragDropComponent';

describe('DragDropComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(<DragDropComponent />);
    expect(container).toBeTruthy();
  });

  it('renders two lists', () => {
    render(<DragDropComponent />);
    expect(screen.getByText(/to do/i)).toBeInTheDocument();
    expect(screen.getByText(/done/i)).toBeInTheDocument();
  });

  it('renders drag items in todo list', () => {
    render(<DragDropComponent />);
    expect(screen.getByText(/Get to work/i)).toBeInTheDocument();
  });
});
```

### Step 8 — Write `src/pages/table/TableComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TableComponent from './TableComponent';

describe('TableComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(<TableComponent />);
    expect(container).toBeTruthy();
  });

  it('renders table column headers', () => {
    render(<TableComponent />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });
});
```

### Step 9 — Write `src/pages/address-form/AddressFormComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import AddressFormComponent from './AddressFormComponent';

function renderForm() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <AddressFormComponent />
    </ThemeProvider>
  );
}

describe('AddressFormComponent', () => {
  it('renders without crashing', () => {
    const { container } = renderForm();
    expect(container).toBeTruthy();
  });

  it('renders all form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zip/i)).toBeInTheDocument();
  });

  it('submit button is disabled when form is empty', () => {
    renderForm();
    const submitBtn = screen.getByRole('button', { name: /next/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows validation error for empty required field on blur', async () => {
    const user = userEvent.setup();
    renderForm();
    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.click(firstNameInput);
    await user.tab(); // blur
    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });
});
```

### Step 10 — Write `src/pages/tree/TreeComponent.test.tsx`
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TreeComponent from './TreeComponent';

describe('TreeComponent', () => {
  it('renders without crashing', () => {
    const { container } = render(<TreeComponent />);
    expect(container).toBeTruthy();
  });

  it('renders top-level tree nodes', () => {
    render(<TreeComponent />);
    // Top-level items from TREE_DATA should be visible
    expect(screen.getByText('Fruit')).toBeInTheDocument();
    expect(screen.getByText('Vegetables')).toBeInTheDocument();
  });
});
```

### Step 11 — Write checkpoint
Create `ai-workflow/output/checkpoints/07-tests.done`

## Success Criteria
- [ ] All 8 test files written
- [ ] Each test file has at least 3 test cases
- [ ] No `TestBed`, `jasmine`, or `karma` imports
- [ ] All tests use `@testing-library/react` `render` and `screen`
- [ ] Mock functions use `vi.fn()` not `jasmine.createSpy()`
- [ ] Async tests use `async/await` with `waitFor`
- [ ] All tests import from Vitest (`describe`, `it`, `expect`, `vi`)
- [ ] Checkpoint file exists
