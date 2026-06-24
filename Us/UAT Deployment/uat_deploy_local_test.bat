@echo off
set "SCRIPT_DIR=%~dp0"
echo ===================================================
echo     RUNNING LOCAL CONTAINERIZED UAT ENVIRONMENT
echo ===================================================
echo.
cd /d "%SCRIPT_DIR%"

:: Check if Docker is installed
docker -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running or not installed on this system!
    echo Please install and start Docker Desktop for Windows to run containers.
    echo.
    pause
    exit /b 1
)

echo Building and starting containers in background...
docker-compose up -d --build

echo.
echo ===================================================
echo               UAT LAUNCH COMPLETED
echo ===================================================
echo.
echo Application URL: http://localhost:8000
echo Database Port:    localhost:27017
echo.
echo To view live container logs, run:
echo   docker logs -f aurumtech_app
echo.
echo To stop and remove the containers, run:
echo   docker-compose down
echo.
pause
