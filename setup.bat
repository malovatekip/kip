@echo off
setlocal EnableDelayedExpansion

echo.
echo ================================================
echo   KIP -- Kwacha Intelligence Platform
echo   Sprint 1 Setup Script (Windows)
echo ================================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo         Download from: https://www.python.org/downloads/
    echo         IMPORTANT: Tick "Add Python to PATH" during install.
    pause & exit /b 1
)
echo [OK] Python found.

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Download LTS from: https://nodejs.org
    pause & exit /b 1
)
echo [OK] Node.js found.

echo.
echo [1/3] Setting up backend...
cd backend
python -m venv venv
if errorlevel 1 ( echo [ERROR] venv creation failed. & pause & exit /b 1 )
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
if errorlevel 1 ( echo [ERROR] pip install failed. & pause & exit /b 1 )
if not exist ".env" ( copy .env.example .env >nul && echo [OK] Created backend\.env )
call venv\Scripts\deactivate.bat
cd ..
echo [OK] Backend ready.

echo.
echo [2/3] Setting up frontend...
cd frontend
npm install
if errorlevel 1 ( echo [ERROR] npm install failed. & pause & exit /b 1 )
cd ..
echo [OK] Frontend ready.

echo.
echo ================================================
echo   Setup complete!
echo.
echo   NEXT STEPS:
echo   1. Open backend\.env in Notepad
echo      Set: ANTHROPIC_API_KEY=your-key-here
echo      Get key: https://console.anthropic.com
echo.
echo   2. Double-click start.bat  (or run start.ps1)
echo   3. Open: http://localhost:3000
echo ================================================
echo.
pause
