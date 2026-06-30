#!/bin/sh
# Start FastAPI backend in the background on localhost:8000
echo "🚀 Starting FastAPI backend on http://127.0.0.1:8000..."
cd /app/backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# Wait for backend to spin up
sleep 3

# Start Next.js frontend in the foreground
# Next.js start command automatically listens to the port specified in the PORT env var
echo "🚀 Starting Next.js frontend..."
cd /app/frontend
exec npm run start
