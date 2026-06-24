@echo off
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "BACKEND_DIR=%PROJECT_ROOT%\Code_Workspace\XRF-Website-Workspace\backend"
set "FRONTEND_DIR=%PROJECT_ROOT%\Code_Workspace\XRF-Website-Workspace\frontend"
set "PORTABLE_DIR=%BACKEND_DIR%\python_portable"

echo ===================================================
echo     Setting Up Portable Environment for Windows
echo ===================================================
echo.
echo Script Location: %SCRIPT_DIR%
echo Project Location: %PROJECT_ROOT%
echo.

:: Create portable folder if not exist
if exist "%PORTABLE_DIR%" goto portable_exists
echo Creating directory for portable Python: %PORTABLE_DIR%
mkdir "%PORTABLE_DIR%"
:portable_exists

:: Download Python 3.11 Embeddable zip
if exist "%PORTABLE_DIR%\python.exe" goto python_downloaded
set "PYTHON_ZIP=%PORTABLE_DIR%\python_embed.zip"
echo Downloading Python 3.11.9 Embeddable...
powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip' -OutFile '%PYTHON_ZIP%'"

echo Extracting Python...
powershell -Command "Expand-Archive -Path '%PYTHON_ZIP%' -DestinationPath '%PORTABLE_DIR%' -Force"

echo Cleaning up zip file...
del "%PYTHON_ZIP%"
:python_downloaded

:: Enable site packages and pip in python311._pth
if not exist "%PORTABLE_DIR%\python311._pth" goto pth_missing
echo Enabling site-packages in Python...
cd /d "%PORTABLE_DIR%"
powershell -Command "(gc python311._pth) -replace '#import site', 'import site' | Out-File -encoding ASCII python311._pth"
cd /d "%SCRIPT_DIR%"
:pth_missing

:: Install pip
if exist "%PORTABLE_DIR%\Scripts\pip.exe" goto pip_installed
echo Downloading get-pip.py...
set "GET_PIP_PY=%PORTABLE_DIR%\get-pip.py"
powershell -Command "Invoke-WebRequest -Uri 'https://bootstrap.pypa.io/get-pip.py' -OutFile '%GET_PIP_PY%'"

echo Installing pip...
"%PORTABLE_DIR%\python.exe" "%GET_PIP_PY%" --no-warn-script-location

del "%GET_PIP_PY%"
:pip_installed

:: Install requirements (excluding jq and emergentintegrations)
if not exist "%BACKEND_DIR%\requirements.txt" goto no_requirements
echo Preparing requirements (excluding jq and emergentintegrations)...
set "TEMP_REQ=%PORTABLE_DIR%\temp_requirements.txt"
powershell -Command "Get-Content '%BACKEND_DIR%\requirements.txt' | Where-Object { $_ -notmatch 'jq' -and $_ -notmatch 'emergentintegrations' } | Set-Content '%TEMP_REQ%'"

echo Installing Backend dependencies...
"%PORTABLE_DIR%\Scripts\pip.exe" install -r "%TEMP_REQ%" --no-warn-script-location

del "%TEMP_REQ%"
goto requirements_done
:no_requirements
echo ERROR: requirements.txt not found.
:requirements_done

:: Create default backend .env if not exists
if exist "%BACKEND_DIR%\.env" goto env_exists
echo Creating default backend .env file...
(
    echo MONGO_URL=mongodb://localhost:27017
    echo DB_NAME=aurumtech
    echo JWT_SECRET=local_development_secret_key_123456
    echo EMERGENT_LLM_KEY=
    echo FRONTEND_URL=http://localhost:3000
) > "%BACKEND_DIR%\.env"
echo Default .env created. Please update it with your MongoDB connection string if needed.
:env_exists

:: Create default frontend .env if not exists
if exist "%FRONTEND_DIR%\.env" goto frontend_env_exists
echo Creating default frontend .env file...
(
    echo REACT_APP_BACKEND_URL=http://localhost:8000
) > "%FRONTEND_DIR%\.env"
echo Default frontend .env created.
:frontend_env_exists

:: Install Frontend dependencies
if not exist "%FRONTEND_DIR%\package.json" goto no_frontend
echo Installing Frontend dependencies (using Node)...
cd /d "%FRONTEND_DIR%"

:: Check if yarn is available, otherwise use npm
yarn -v >nul 2>&1
if %errorlevel% equ 0 goto use_yarn
echo Running npm install --legacy-peer-deps...
call npm install --legacy-peer-deps
echo Installing explicit AJV version 8 to prevent webpack compilation errors...
call npm install ajv@^8.0.0 --legacy-peer-deps
goto frontend_done

:use_yarn
echo Running yarn install...
call yarn install

:frontend_done
cd /d "%SCRIPT_DIR%"
:no_frontend

echo.
echo ===================================================
echo             PORTABLE SETUP COMPLETED
echo ===================================================
echo.
pause
