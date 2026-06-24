@echo off
setlocal enabledelayedexpansion

:: ===================================================
::   AURUMTECH INSTRUMENTS - UAT DEPLOYMENT AUTOMATION
:: ===================================================

:: --- CONFIGURATION ---
:: (You can type your IP and key path here to skip the prompts in the future)
set "VM_IP=141.148.195.149"
set "SSH_KEY=C:\Users\harshita\.ssh\ssh-key-2026-06-20 (5).key"

:: ----------------------------------------------------

echo ===================================================
echo     AurumTech Instruments - UAT Deployer
echo ===================================================
echo.

:: Prompt for VM IP if not defined
if "%VM_IP%"=="" (
    set /p VM_IP="Enter your Oracle VM Public IP: "
)
if "!VM_IP!"=="" (
    echo [ERROR] VM Public IP is required.
    pause
    exit /b 1
)

:: Prompt for SSH Key path if not defined
if "%SSH_KEY%"=="" (
    set /p SSH_KEY="Enter the path to your private key file (e.g. E:\Gold_XRF_SITE\ssh-key.key): "
)
:: Remove quotes from path if entered by user
set "SSH_KEY=!SSH_KEY:"=!"

if not exist "!SSH_KEY!" (
    echo [ERROR] Private key file does not exist at: !SSH_KEY!
    pause
    exit /b 1
)

:: Define folders
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=!SCRIPT_DIR!..\"
set "FRONTEND_DIR=!ROOT_DIR!Code_Workspace\XRF-Website-Workspace\frontend"
set "BACKEND_DIR=!ROOT_DIR!Code_Workspace\XRF-Website-Workspace\backend"

echo.
echo [1/5] Building frontend React SPA locally...
echo ---------------------------------------------------
cd /d "!FRONTEND_DIR!"
rmdir /s /q "build" 2>nul
rmdir /s /q "node_modules\.cache" 2>nul
copy /y .env .env.backup >nul 2>&1
echo REACT_APP_BACKEND_URL=>.env
set GENERATE_SOURCEMAP=false
set NODE_OPTIONS=--max-old-space-size=4096
call npm run build
copy /y .env.backup .env >nul 2>&1
del .env.backup >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Frontend React build failed!
    cd /d "!SCRIPT_DIR!"
    pause
    exit /b 1
)

echo.
echo [2/5] Preparing deployment bundle...
echo ---------------------------------------------------
cd /d "!SCRIPT_DIR!"
set "DEPLOY_TEMP=!SCRIPT_DIR!deploy_temp"
if exist "!DEPLOY_TEMP!" rmdir /s /q "!DEPLOY_TEMP!"
mkdir "!DEPLOY_TEMP!"

:: Copy backend files (excluding heavy folders during copy)
echo Copying backend files...
robocopy "!BACKEND_DIR!" "!DEPLOY_TEMP!\backend" /e /xd python_portable uploads venv .venv __pycache__ .git >nul
if %errorlevel% geq 8 (
    echo [ERROR] Failed to copy backend files.
    rmdir /s /q "!DEPLOY_TEMP!" 2>nul
    pause
    exit /b 1
)

:: Copy pre-built frontend static assets
echo Copying frontend build...
mkdir "!DEPLOY_TEMP!\frontend\build"
xcopy /e /q /y /i "!FRONTEND_DIR!\build" "!DEPLOY_TEMP!\frontend\build" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy frontend build files.
    rmdir /s /q "!DEPLOY_TEMP!" 2>nul
    pause
    exit /b 1
)

:: Copy docker configurations
copy "!SCRIPT_DIR!Dockerfile" "!DEPLOY_TEMP!\Dockerfile" >nul
copy "!SCRIPT_DIR!docker-compose.yml" "!DEPLOY_TEMP!\docker-compose.yml" >nul
copy "!SCRIPT_DIR!nginx.conf" "!DEPLOY_TEMP!\nginx.conf" >nul

:: Create tarball using native Windows tar command
echo Packaging deployment archive...
cd /d "!DEPLOY_TEMP!"
tar -czf ..\deploy.tar.gz .
if %errorlevel% neq 0 (
    echo [ERROR] Failed to package deployment archive.
    cd /d "!SCRIPT_DIR!"
    rmdir /s /q "!DEPLOY_TEMP!" 2>nul
    pause
    exit /b 1
)
cd /d "!SCRIPT_DIR!"
rmdir /s /q "!DEPLOY_TEMP!"

echo.
echo [3/5] Uploading deployment package to VM...
echo ---------------------------------------------------
scp -i "!SSH_KEY!" deploy.tar.gz ubuntu@!VM_IP!:~/
if %errorlevel% neq 0 (
    echo [ERROR] Failed to upload package to VM! Check your IP, key path, or SSH agent.
    del deploy.tar.gz 2>nul
    pause
    exit /b 1
)
del deploy.tar.gz 2>nul

echo.
echo [4/5] Deploying and building Docker container on VM...
echo ---------------------------------------------------
ssh -i "!SSH_KEY!" ubuntu@!VM_IP! "mkdir -p ~/app && tar -xzf ~/deploy.tar.gz -C ~/app && cd ~/app && docker-compose down && docker-compose up -d --build && rm ~/deploy.tar.gz"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run Docker commands on the VM. Make sure Docker is installed on the VM and the user has permissions.
    pause
    exit /b 1
)

echo.
echo [5/5] Patching remote .env with domain URL and secure cookies...
echo ---------------------------------------------------
ssh -i "!SSH_KEY!" ubuntu@!VM_IP! "sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://ornetops.online|' ~/app/backend/.env && grep -q 'COOKIE_SECURE' ~/app/backend/.env && sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=true|' ~/app/backend/.env || echo 'COOKIE_SECURE=true' >> ~/app/backend/.env && docker restart aurumtech_app"
if %errorlevel% neq 0 (
    echo [WARNING] Could not patch remote .env — login from domain may not work until done manually.
)

echo.
echo ===================================================
echo            UAT DEPLOYMENT SUCCESSFUL!
echo ===================================================
echo.
echo Your website is live at: https://ornetops.online/
echo (also reachable at: https://!VM_IP!/)
echo.
echo Done.
