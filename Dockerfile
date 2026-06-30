# --- Stage 1: Build Next.js Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Combined Runtime Environment ---
FROM python:3.12-slim
WORKDIR /app

# Install Node.js & NPM for Next.js execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    libgomp1 \
 && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y nodejs \
 && rm -rf /var/lib/apt/lists/*

# Set up Python Backend
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/

# Set up Next.js Frontend
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Copy and make entrypoint executable
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Expose Next.js port (FastAPI will run internally on 8000)
EXPOSE 3000

CMD ["/app/entrypoint.sh"]
