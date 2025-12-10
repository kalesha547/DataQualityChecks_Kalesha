# Frontend Installation Guide

## Issue: Unable to Install Node Modules

If you're having trouble installing node modules, follow these steps:

## Solution 1: Use --legacy-peer-deps (Recommended)

This is the quickest solution. Run:

```bash
npm install --legacy-peer-deps
```

Or if using PowerShell with execution policy issues:

```bash
cmd /c npm install --legacy-peer-deps
```

## Solution 2: Fix PowerShell Execution Policy

If you're getting PowerShell execution policy errors:

1. Open PowerShell as Administrator
2. Run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Then try `npm install` again

## Solution 3: Use Command Prompt Instead

1. Open Command Prompt (cmd.exe) - not PowerShell
2. Navigate to the frontend directory:
   ```cmd
   cd D:\GenAI\TMSDATAQUALITYCHECKS_AI\frontend
   ```
3. Run:
   ```cmd
   npm install --legacy-peer-deps
   ```

## Solution 4: Clean Install

If the above don't work:

1. Delete `node_modules` folder (if it exists)
2. Delete `package-lock.json` (if it exists)
3. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
4. Install with legacy peer deps:
   ```bash
   npm install --legacy-peer-deps
   ```

## Solution 5: Use Yarn Instead

If npm continues to have issues:

1. Install Yarn globally:
   ```bash
   npm install -g yarn
   ```
2. Use Yarn to install:
   ```bash
   yarn install
   ```

## Why --legacy-peer-deps?

Angular 19 has strict peer dependency requirements. The `--legacy-peer-deps` flag tells npm to use the old (npm v6) dependency resolution algorithm, which is more lenient with peer dependencies. This is safe for this project.

## After Installation

Once installation completes, you can start the development server:

```bash
npm start
```

Or if using Yarn:

```bash
yarn start
```

The application will be available at http://localhost:4200

