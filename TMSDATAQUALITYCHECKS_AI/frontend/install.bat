@echo off
echo Installing frontend dependencies...
echo.
echo This script will install with --legacy-peer-deps to avoid dependency conflicts
echo.

if exist node_modules (
    echo Removing existing node_modules...
    rmdir /s /q node_modules
)

if exist package-lock.json (
    echo Removing package-lock.json...
    del package-lock.json
)

echo.
echo Installing dependencies...
call npm install --legacy-peer-deps

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Installation successful!
    echo.
    echo You can now start the development server with: npm start
) else (
    echo.
    echo Installation failed. Please check the error messages above.
    echo.
    echo Try running: npm cache clean --force
    echo Then run this script again.
)

pause

