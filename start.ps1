# KIP Start Script - PowerShell (Windows 11)
# Run with: powershell -ExecutionPolicy Bypass -File start.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail($msg) {
    Write-Host "`n  [ERROR] $msg" -ForegroundColor Red
    Write-Host "`nPress any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  KIP -- Kwacha Intelligence Platform" -ForegroundColor White
Write-Host "  Starting..." -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan

if (-not (Test-Path "$ScriptDir\backend\venv\Scripts\python.exe")) {
    Fail "Backend not set up. Please run: powershell -ExecutionPolicy Bypass -File setup.ps1"
}
if (-not (Test-Path "$ScriptDir\frontend\node_modules")) {
    Fail "Frontend not set up. Please run: powershell -ExecutionPolicy Bypass -File setup.ps1"
}

# Warn if API key not set
$envContent = Get-Content "$ScriptDir\backend\.env" -Raw -ErrorAction SilentlyContinue
if ($envContent -match "your-anthropic-api-key-here") {
    Write-Host "  [NOTE] ANTHROPIC_API_KEY not set in backend\.env" -ForegroundColor Yellow
    Write-Host "         AI responses will be placeholders until key is added.`n" -ForegroundColor Gray
}

# Start Backend
Write-Host "  Starting backend on http://localhost:8000 ..." -ForegroundColor Gray
$be = "Set-Location '$ScriptDir\backend'; & 'venv\Scripts\activate.ps1'; Write-Host 'KIP Backend running at http://localhost:8000' -ForegroundColor Green; uvicorn main:app --reload --port 8000"
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $be

Start-Sleep -Seconds 4

# Start Frontend
Write-Host "  Starting frontend on http://localhost:3000 ..." -ForegroundColor Gray
$fe = "Set-Location '$ScriptDir\frontend'; Write-Host 'KIP Frontend running at http://localhost:3000' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", $fe

Start-Sleep -Seconds 3

Write-Host "`n================================================" -ForegroundColor Green
Write-Host "  KIP is running!" -ForegroundColor Green
Write-Host "`n  Frontend  : http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend   : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs  : http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "`n  Two terminal windows are now running." -ForegroundColor White
Write-Host "  Close them to stop KIP." -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Green

Start-Process "http://localhost:3000"

Write-Host "Press any key to close this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
