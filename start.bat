@echo off
REM Windows Batch Script to Start Chat Application
REM This script starts both backend and frontend servers

echo.
echo =====================================
echo   Starting Chat Application
echo =====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js is installed
node --version

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed!
    pause
    exit /b 1
)

echo [OK] npm is installed
npm --version
echo.

REM Check if backend/.env exists
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found!
    echo Please run: npm run setup
    echo Or manually create backend\.env from backend\.env.example
    echo.
    pause
    exit /b 1
)

echo [OK] Environment configuration found
echo.

REM Check if node_modules exist
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo =====================================
echo   Starting Servers
echo =====================================
echo.
echo Backend will run on: http://localhost:5001
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start backend and frontend in new windows
start "Chat Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Chat Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo [INFO] Servers are starting in separate windows...
echo [INFO] Wait a few seconds, then open: http://localhost:5173
echo.
pause
