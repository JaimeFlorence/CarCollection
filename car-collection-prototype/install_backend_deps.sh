#!/bin/bash
"""
Install Backend Dependencies

This script installs the new dependencies needed for the service research feature.
"""

echo "🔧 Installing backend dependencies for service research..."
echo "=================================================="

# Change to backend directory
cd /home/jaime/MyCode/src/CarCollection/backend

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "✅ Found virtual environment"
    source venv/bin/activate
    echo "✅ Activated virtual environment"
else
    echo "❌ Virtual environment not found"
    echo "Please run: python3 -m venv venv"
    exit 1
fi

# Install new dependencies
echo "📦 Installing aiohttp..."
pip install aiohttp==3.9.1

echo "📦 Installing beautifulsoup4..."
pip install beautifulsoup4==4.12.2

echo "📦 Installing lxml..."
pip install lxml==4.9.3

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "🚀 You can now start the backend server with:"
echo "   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"