FROM python:3.11-slim
WORKDIR /app

# Install standard utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements list
COPY backend/requirements.txt ./backend/

# Strip Windows-incompatible and private libs from requirements dynamically
RUN grep -v "jq" ./backend/requirements.txt | grep -v "emergentintegrations" > ./backend/requirements_clean.txt \
    && pip install --no-cache-dir -r ./backend/requirements_clean.txt

# Copy backend source code
COPY backend/ ./backend/

# Copy the compiled static assets from local build
COPY frontend/build ./frontend/build

# Create uploads directory (for Docker volume mounting)
RUN mkdir -p /app/backend/uploads

EXPOSE 8000
WORKDIR /app/backend

# Run FastAPI served via Uvicorn ASGI server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
