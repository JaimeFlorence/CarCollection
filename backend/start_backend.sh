#!/bin/bash
# Start the backend server for local development

echo "Starting Car Collection Backend..."

# Activate virtual environment
source venv/bin/activate

# Kill any existing processes on port 8000
echo "Checking for existing processes on port 8000..."
lsof -ti:8000 | xargs kill -9 2>/dev/null

# Start the backend
echo "Starting uvicorn server..."
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# This will keep running until you press Ctrl+C