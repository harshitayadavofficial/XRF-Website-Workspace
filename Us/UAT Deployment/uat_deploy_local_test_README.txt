======================================================================
               LOCAL CONTAINERIZED UAT DEPLOYMENT README
======================================================================

File: uat_deploy_local_test.bat
Purpose: Builds the production Docker image (combining React frontend and
         FastAPI backend) and runs it alongside a MongoDB container.

----------------------------------------------------------------------
Prerequisites:
----------------------------------------------------------------------
* Docker Desktop for Windows must be installed and running.

----------------------------------------------------------------------
What this script does:
----------------------------------------------------------------------
1. Verifies that the Docker engine is running.
2. Triggers a multi-stage Docker build:
   - Compiles the React frontend static assets inside a Node environment.
   - Sets up Python 3.11, filters backend requirements, and builds the runner image.
3. Serves the static web app directly from the FastAPI Python server at port 8000.
4. Starts a standard MongoDB container as a database service.
5. Sets up persistent storage volumes for both files (`uploads/`) and database data (`/data/db`), ensuring they survive container updates.

----------------------------------------------------------------------
How to use it:
----------------------------------------------------------------------
* Double-click `uat_deploy_local_test.bat`.
* Access the running website at: http://localhost:8000
* Note: Unlike local development, there is no hot-reloading. The code is compiled into a production bundle, behaving exactly like it will in the cloud.

----------------------------------------------------------------------
How to stop it:
----------------------------------------------------------------------
* Open your command prompt in this folder, and run:
  `docker-compose down`
======================================================================
