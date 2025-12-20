# PowerShell Script to Start Chat Application
# This script starts both backend and frontend servers

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "   Starting Chat Application" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm is installed: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm is not installed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check backend/.env
if (-not (Test-Path "backend\.env")) {
    Write-Host "[WARNING] backend\.env not found!" -ForegroundColor Yellow
    Write-Host "Please run: npm run setup" -ForegroundColor Yellow
    Write-Host "Or manually create backend\.env from backend\.env.example" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Environment configuration found" -ForegroundColor Green
Write-Host ""

# Check and install dependencies
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "[INFO] Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[INFO] Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   Starting Servers" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend will run on:  http://localhost:5001" -ForegroundColor Green
Write-Host "Frontend will run on: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C in each terminal to stop the servers" -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Starting Backend Server...' -ForegroundColor Cyan; npm run dev"

# Wait a moment before starting frontend
Start-Sleep -Seconds 2

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Starting Frontend Server...' -ForegroundColor Cyan; npm run dev"

Write-Host ""
Write-Host "[INFO] Servers are starting in separate windows..." -ForegroundColor Green
Write-Host "[INFO] Wait a few seconds, then open: http://localhost:5173" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close this window"
