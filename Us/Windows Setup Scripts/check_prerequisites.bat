@echo off
echo ===================================================
echo        AURUMTECH SYSTEM PREREQUISITE CHECK
echo ===================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do echo [OK] Python is installed: %%i
) else (
    echo [MISSING] Python is NOT installed or not added to PATH.
)

:: Check Node.js
node -v >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do echo [OK] Node.js is installed: %%i
) else (
    echo [MISSING] Node.js is NOT installed or not added to PATH.
)

:: Check npm
npm -v >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do echo [OK] npm is installed: v%%i
) else (
    echo [MISSING] npm is NOT installed or not added to PATH.
)

:: Check Yarn
yarn -v >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('yarn -v') do echo [OK] Yarn is installed: v%%i
) else (
    echo [INFO] Yarn is NOT installed (We can fallback to npm if needed).
)

:: Check Docker
docker --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('docker --version') do echo [OK] Docker is installed: %%i
) else (
    echo [INFO] Docker is NOT installed (Optional if using MongoDB Atlas).
)

echo.
echo ===================================================
pause
