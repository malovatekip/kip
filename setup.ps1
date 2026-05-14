# KIP Setup Script - PowerShell (Windows 11)
# Run with: powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail($msg) {
    Write-Host "`n  [ERROR] $msg" -ForegroundColor Red
    Write-Host "`nPress any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  KIP -- Kwacha Intelligence Platform" -ForegroundColor White
Write-Host "  Setup Script (Windows PowerShell)" -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan

# Prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try   { $v = python --version 2>&1; Write-Host "  [OK] $v" -ForegroundColor Green }
catch { Fail "Python not found. Get it at https://www.python.org/downloads/ - tick 'Add to PATH'" }

try   { $v = node --version 2>&1; Write-Host "  [OK] Node.js $v" -ForegroundColor Green }
catch { Fail "Node.js not found. Get LTS from https://nodejs.org" }

# Backend
Write-Host "`n[1/3] Setting up backend..." -ForegroundColor Yellow
Set-Location "$ScriptDir\backend"

# Clean old venv if present
if (Test-Path "venv") {
    Write-Host "  Removing old virtual environment..." -ForegroundColor Gray
    Remove-Item -Recurse -Force "venv"
}

Write-Host "  Creating virtual environment..." -ForegroundColor Gray
python -m venv venv
if ($LASTEXITCODE -ne 0) { Fail "Could not create virtual environment." }

Write-Host "  Installing packages (may take 1-2 minutes)..." -ForegroundColor Gray

# Use --only-binary to force pre-built wheels — no Rust/C compilation needed
& "venv\Scripts\pip.exe" install -r requirements.txt --only-binary :all: --quiet 2>&1 | Where-Object { $_ -notmatch "^(NOTICE|WARNING|notice)" }

if ($LASTEXITCODE -ne 0) {
    Write-Host "  Pre-built install failed, trying standard install..." -ForegroundColor Yellow
    & "venv\Scripts\pip.exe" install -r requirements.txt --quiet 2>&1 | Where-Object { $_ -notmatch "^(NOTICE|WARNING|notice)" }
    if ($LASTEXITCODE -ne 0) { Fail "pip install failed. Check your internet connection." }
}

Write-Host "  [OK] Backend packages installed" -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  [OK] Created backend\.env" -ForegroundColor Green
} else {
    Write-Host "  [OK] backend\.env already exists" -ForegroundColor Green
}
Set-Location $ScriptDir

# Frontend
Write-Host "`n[2/3] Setting up frontend..." -ForegroundColor Yellow
Set-Location "$ScriptDir\frontend"
Write-Host "  Installing npm packages (may take 1-2 minutes)..." -ForegroundColor Gray
npm install --silent
if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
Write-Host "  [OK] Frontend packages installed" -ForegroundColor Green
Set-Location $ScriptDir

# Done
Write-Host "`n[3/3] Complete!" -ForegroundColor Yellow
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  SUCCESS! KIP is ready to launch." -ForegroundColor Green
Write-Host "`n  BEFORE STARTING:" -ForegroundColor Yellow
Write-Host "  Open  backend\.env  in Notepad and set:" -ForegroundColor White
Write-Host "  ANTHROPIC_API_KEY=sk-ant-xxxx" -ForegroundColor Cyan
Write-Host "  Get key: https://console.anthropic.com" -ForegroundColor Gray
Write-Host "`n  TO START KIP:" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File start.ps1" -ForegroundColor Cyan
Write-Host "  OR double-click: start.bat" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Green

Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
