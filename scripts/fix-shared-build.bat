@echo off
REM ╔══════════════════════════════════════════════════════════════════════════════╗
REM ║                     WealthLog Shared Package Build Fix                        ║
REM ║                          Windows Batch Script                                 ║
REM ╚══════════════════════════════════════════════════════════════════════════════╝

echo ====================================================================
echo                WealthLog Shared Package Build Fix
echo ====================================================================
echo.

cd /d "%~dp0\..\wealthlogs-code\packages\shared"

echo [INFO] Current directory: %cd%
echo.

echo [INFO] Cleaning shared package...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f package-lock.json
if exist dist rmdir /s /q dist
echo [SUCCESS] Cleaned shared package
echo.

echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed
echo.

echo [INFO] Ensuring @types/node is installed...
call npm install @types/node@20.0.0
if %errorlevel% neq 0 (
    echo [WARNING] Could not install @types/node separately
)
echo.

echo [INFO] Building shared package...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    echo.
    echo Trying alternative approach...
    echo.
    
    REM Try with npx tsc directly
    echo [INFO] Trying direct TypeScript compilation...
    call npx tsc
    if %errorlevel% neq 0 (
        echo [ERROR] Direct compilation also failed
        pause
        exit /b 1
    )
)

echo.
echo ====================================================================
echo                    BUILD SUCCESSFUL!
echo ====================================================================
echo.
echo [SUCCESS] Shared package is now ready for use!
echo.
echo Next steps:
echo 1. Install other packages:
echo    cd ..\..\apps\backend ^&^& npm install --legacy-peer-deps
echo    cd ..\web ^&^& npm install --legacy-peer-deps
echo.
echo 2. Commit and push:
echo    git add .
echo    git commit -m "fix: shared package TypeScript build"
echo    git push
echo.
pause
