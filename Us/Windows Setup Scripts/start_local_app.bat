@echo off
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_ROOT%\Code_Workspace\XRF-Website-Workspace\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\Code_Workspace\XRF-Website-Workspace\frontend"
set "PORTABLE_DIR=%BACKEND_DIR%\python_portable"

echo ===================================================
echo           STARTING AURUMTECH WEBSITE LOCALLY
echo ===================================================
echo.
echo Launching Backend Server...

:: Start Backend in a new command window
start "AurumTech Backend (FastAPI)" cmd /k "cd /d "%BACKEND_DIR%" && "%PORTABLE_DIR%\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload"

echo Launching Frontend Dev Server...
echo (This will open in your browser automatically at http://localhost:3000)
echo.

:: Start Frontend in this window
cd /d "%FRONTEND_DIR%"
yarn -v >nul 2>&1
if %errorlevel% equ 0 (
    call yarn start
) else (
    call npm start
)

pause
