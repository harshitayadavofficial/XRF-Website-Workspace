======================================================================
                     START LOCAL APP README
======================================================================

File: start_local_app.bat
Purpose: Starts the local development environment for both Frontend and Backend.

----------------------------------------------------------------------
Prerequisites:
----------------------------------------------------------------------
Make sure you have run `setup_portable_env.bat` at least once to install Python and download packages.

----------------------------------------------------------------------
What this script does:
----------------------------------------------------------------------
1. Opens a new Command Prompt window and runs the FastAPI backend server (via uvicorn) on port 8000 using the local portable Python engine.
2. Runs the React frontend development server in the current Command Prompt window.
3. Automatically opens your web browser to the homepage at: http://localhost:3000

----------------------------------------------------------------------
How to use it:
----------------------------------------------------------------------
* Double-click `start_local_app.bat` to launch the website.
* Keep both Command Prompt windows open while you are testing the website.
* To close the website, simply close the Command Prompt windows.
======================================================================
