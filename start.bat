@echo off
setlocal

echo.
echo ================================================
echo   KIP -- Kwacha Intelligence Platform
echo ================================================
echo.

if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Run setup.bat first.
    pause & exit /b 1
)
if not exist "frontend\node_modules" (
    echo [ERROR] Run setup.bat first.
    pause & exit /b 1
)

echo Starting KIP Backend on http://localhost:8000 ...
start "KIP Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"

timeout /t 4 /nobreak >nul

echo Starting KIP Frontend on http://localhost:3000 ...
start "KIP Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo ================================================
echo   KIP is running!
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo.
echo   Close the two terminal windows to stop KIP.
echo ================================================
echo.

start "" "http://localhost:3000"
pause
