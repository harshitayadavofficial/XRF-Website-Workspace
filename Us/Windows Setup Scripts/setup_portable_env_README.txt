======================================================================
                  SETUP PORTABLE ENVIRONMENT README
======================================================================

File: setup_portable_env.bat
Purpose: Downloads, configures, and prepares an isolated Python environment
         and installs both backend and frontend dependencies.

----------------------------------------------------------------------
What this script does:
----------------------------------------------------------------------
1. Creates a local folder named `python_portable` inside the Python backend directory.
2. Downloads the official Python 3.11 Windows Embeddable engine from Python.org.
3. Automatically unlocks it (by modifying python311._pth to enable "site-packages" and imports).
4. Bootstraps "pip" inside the portable Python directory.
5. Safely filters out the "jq" library (which fails to compile on Windows) and installs all other backend dependencies from `backend/requirements.txt`.
6. Generates a default local backend `.env` configuration file if it does not already exist.
7. Installs frontend node dependencies inside the frontend directory using your global Node installation (tries "yarn install" first, then falls back to "npm install").

----------------------------------------------------------------------
How to use it:
----------------------------------------------------------------------
* Double-click `setup_portable_env.bat` or run it from your command prompt.
* Note: You only need to run this script ONCE or whenever you copy the folder to a new computer.

----------------------------------------------------------------------
Why we use this:
----------------------------------------------------------------------
This keeps your global Windows environment clean. It prevents version clashes with other projects you are working on, since Python and its packages are stored exclusively inside this workspace directory.
======================================================================
