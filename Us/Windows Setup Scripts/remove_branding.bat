@echo off
set "SCRIPT_DIR=%~dp0"
set "INDEX_HTML=%SCRIPT_DIR%..\Code_Workspace\XRF-Website-Workspace\frontend\public\index.html"

if exist "%INDEX_HTML%" (
    echo Removing "Made with Emergent" branding from index.html...
    powershell -Command "(Get-Content '%INDEX_HTML%' -Raw) -replace '(?s)\s*<a\s+id=\"emergent-badge\".*?</a>', '' | Set-Content '%INDEX_HTML%'"
    echo Branding removed successfully!
) else (
    echo [ERROR] index.html not found at: %INDEX_HTML%
)
