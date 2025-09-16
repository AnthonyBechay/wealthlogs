@echo off
REM Simple setup script for WealthLog (Windows)

echo ==============================
echo WealthLog Setup Script
echo ==============================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Display versions
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% and npm %NPM_VERSION% detected
echo.

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Install concurrently
echo Checking concurrently...
call npm list concurrently >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing concurrently...
    call npm install --save-dev concurrently
)
echo [OK] Concurrently available
echo.

REM Build shared package
echo Building shared package...
cd wealthlogs-code\packages\shared
call npm run build 2>nul || call npx tsc 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Shared package built
) else (
    echo [WARNING] Shared package build failed - this might not be critical
)
cd ..\..\..
echo.

REM Create environment files if they don't exist
echo Setting up environment files...

REM Backend .env
if not exist "wealthlogs-code\apps\backend\.env" (
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo DATABASE_URL=postgresql://abechay:12345678@localhost:5432/wealthlog
        echo JWT_ACCESS_SECRET=your-access-secret-key-change-this
        echo JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
        echo SECRET_KEY=your-secret-key-change-this
        echo SESSION_SECRET=your-session-secret-change-this
        echo FRONTEND_URL=http://localhost:3000
        echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
    ) > wealthlogs-code\apps\backend\.env
    echo [OK] Backend .env created - Please update with your database credentials
) else (
    echo [OK] Backend .env already exists
)

REM Frontend .env.local
if not exist "wealthlogs-code\apps\web\.env.local" (
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000
        echo NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
    ) > wealthlogs-code\apps\web\.env.local
    echo [OK] Frontend .env.local created
) else (
    echo [OK] Frontend .env.local already exists
)
echo.

REM Check database connection
echo Checking database connection...
cd wealthlogs-code\apps\backend
call npx prisma db push --skip-generate 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Database connected and schema synced
) else (
    echo [WARNING] Database connection failed
    echo    Please check your DATABASE_URL in backend\.env
    echo    Make sure PostgreSQL is running and the database 'wealthlog' exists
)
cd ..\..\..
echo.

echo ==============================
echo Setup complete!
echo ==============================
echo.
echo To start the development servers, run:
echo   npm run dev
echo.
echo Available commands:
echo   npm run dev          - Start both backend and frontend
echo   npm run dev:web      - Start frontend only
echo   npm run dev:backend  - Start backend only
echo   npm run build        - Build all packages
echo   npm run db:studio    - Open Prisma Studio
echo   npm run clean        - Clean all build artifacts
echo   npm run fresh        - Clean and reinstall everything
echo.
pause
