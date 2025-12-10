@echo off
echo ========================================
echo Installing Angular Frontend Dependencies
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Cleaning previous installation...
if exist node_modules (
    echo Removing node_modules...
    rmdir /s /q node_modules
)
if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo Step 2: Clearing npm cache...
call npm cache clean --force

echo.
echo Step 3: Installing all dependencies...
call npm install --legacy-peer-deps

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Installation failed!
    echo.
    pause
    exit /b 1
)

echo.
echo Step 4: Verifying critical packages...
if not exist "node_modules\@angular-devkit\build-angular" (
    echo Installing @angular-devkit/build-angular...
    call npm install @angular-devkit/build-angular@^19.0.0 --legacy-peer-deps --save-dev
)

if not exist "node_modules\@angular\cli" (
    echo Installing @angular/cli...
    call npm install @angular/cli@^19.0.0 --legacy-peer-deps --save-dev
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo You can now start the server with: npm start
echo.
pause

