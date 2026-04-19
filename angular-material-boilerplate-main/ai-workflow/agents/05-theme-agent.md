# Agent 5 — Theme Agent

## Role
You are the **Theme Agent**. Convert Angular Material 3 SCSS theming to
MUI v5's `ThemeProvider` + `createTheme` system with full dark/light mode support.

## Inputs
Read:
- `src/theme/m3-theme.scss`
- `src/theme/_custom_classes.scss`
- `src/theme/mixins/_layout-component.theme.scss`
- `src/styles.scss`
- `src/app/shared/components/theme-toggle/theme-toggle.component.ts`

## Steps

### Step 1 — Extract color values from `m3-theme.scss`
Read the Angular M3 theme file. Extract the primary, secondary, tertiary, error,
surface, and background color tokens for both light and dark schemes.
These are in CSS custom properties like `--mat-app-primary`, `--mat-app-background`.

Common M3 default values if the file uses the default palette:
- Primary: `#6750A4`
- On-Primary: `#FFFFFF`
- Secondary: `#625B71`
- Surface: `#FFFBFE` (light) / `#1C1B1F` (dark)
- Background: `#FFFBFE` (light) / `#1C1B1F` (dark)
- Error: `#B3261E`

### Step 2 — Write `src/theme/theme.ts`
Create a `buildTheme` function that accepts `'light' | 'dark'` and returns an MUI `Theme`:

```typescript
import { createTheme, Theme, responsiveFontSizes } from '@mui/material/styles';

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const isLight = mode === 'light';

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: '#6750A4',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#625B71',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#B3261E',
      },
      background: {
        default: isLight ? '#FFFBFE' : '#1C1B1F',
        paper: isLight ? '#FFFFFF' : '#2B2930',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 400 },
      h2: { fontWeight: 400 },
    },
    shape: {
      borderRadius: 12, // M3 uses larger border radius
    },
    components: {
      // Match Angular Material M3 button styles
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            textTransform: 'none',
            fontWeight: 500,
          },
        },
      },
      // Match Angular Material M3 card styles
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      // Match Angular Material M3 drawer styles
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRadius: '0 16px 16px 0',
          },
        },
      },
    },
  });

  return responsiveFontSizes(theme);
}
```

### Step 3 — Write `src/theme/ThemeContext.tsx`
Full implementation of the Theme Context Provider:

```tsx
import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useState } from 'react';
import { buildTheme } from './theme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  toggleTheme: () => {},
});

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('app-theme') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') return stored;
    return prefersDark ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setMode(prev => {
      const next: ThemeMode = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('app-theme', next);
      return next;
    });
  };

  const theme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
```

### Step 4 — Write `src/theme/GlobalStyles.tsx`
Convert `src/styles.scss` global styles:

```tsx
import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

export default function GlobalStyles() {
  return (
    <MuiGlobalStyles
      styles={{
        '*': {
          boxSizing: 'border-box',
        },
        'html, body': {
          margin: 0,
          padding: 0,
          height: '100%',
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
        '#root': {
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        // Scrollbar styling (from styles.scss if present)
        '::-webkit-scrollbar': {
          width: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          borderRadius: '4px',
        },
      }}
    />
  );
}
```

### Step 5 — Update `src/theme/ThemeContext.tsx` to include GlobalStyles
Add `<GlobalStyles />` inside the provider:
```tsx
<MuiThemeProvider theme={theme}>
  <CssBaseline />
  <GlobalStyles />
  {children}
</MuiThemeProvider>
```

### Step 6 — Write `src/components/shared/ThemeToggle.tsx`
Final implementation consuming `useAppTheme`:

```tsx
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAppTheme } from '../../theme/ThemeContext';

export default function ThemeToggle() {
  const { mode, toggleTheme } = useAppTheme();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={`Switch to ${isDark ? 'light' : 'dark'} mode`} placement="bottom">
      <IconButton onClick={toggleTheme} color="inherit" aria-label="toggle theme">
        {isDark ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
}
```

### Step 7 — Write checkpoint
Create `ai-workflow/output/checkpoints/05-theme.done`

## Angular SCSS → MUI Theme Mapping Reference

| Angular M3 SCSS | MUI ThemeProvider |
|----------------|-------------------|
| `mat.define-theme(...)` | `createTheme({ palette: { mode } })` |
| `mat.all-component-themes($theme)` | `<MuiThemeProvider theme={theme}>` |
| `$theme: mat.define-theme(...)` | `buildTheme('light' \| 'dark')` |
| `mat.get-theme-color($theme, primary)` | `theme.palette.primary.main` |
| `body.dark-theme` class | `palette.mode: 'dark'` |
| `localStorage.getItem('darkMode')` | `localStorage.getItem('app-theme')` |
| `prefers-color-scheme: dark` media query | `useMediaQuery('(prefers-color-scheme: dark)')` |
| Angular CssBaseline (none) | MUI `<CssBaseline />` |
| `styles.scss` global styles | `<GlobalStyles />` component |

## Success Criteria
- [ ] `src/theme/theme.ts` written with M3-equivalent colors
- [ ] `src/theme/ThemeContext.tsx` written with full Provider + hook
- [ ] `src/theme/GlobalStyles.tsx` written from `styles.scss`
- [ ] `src/components/shared/ThemeToggle.tsx` uses `useAppTheme` hook
- [ ] Dark mode persists to localStorage with key `'app-theme'`
- [ ] System preference (`prefers-color-scheme`) used as fallback
- [ ] Checkpoint file exists
