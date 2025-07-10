#!/bin/bash
echo "🔍 Car Collection Debug Information"
echo "=================================="
echo

# Check if backend dependencies are installed
echo "📦 Checking backend dependencies..."
cd /home/jaime/MyCode/src/CarCollection/backend

if [ -d "venv" ]; then
    echo "✅ Virtual environment found"
    source venv/bin/activate
    
    echo "🔍 Checking for aiohttp..."
    if python -c "import aiohttp" 2>/dev/null; then
        echo "✅ aiohttp is installed"
    else
        echo "❌ aiohttp is NOT installed"
        echo "   Run: pip install aiohttp==3.9.1"
    fi
    
    echo "🔍 Checking for beautifulsoup4..."
    if python -c "import bs4" 2>/dev/null; then
        echo "✅ beautifulsoup4 is installed"
    else
        echo "❌ beautifulsoup4 is NOT installed"
        echo "   Run: pip install beautifulsoup4==4.12.2"
    fi
    
    echo "🔍 Checking for lxml..."
    if python -c "import lxml" 2>/dev/null; then
        echo "✅ lxml is installed"
    else
        echo "❌ lxml is NOT installed"
        echo "   Run: pip install lxml==4.9.3"
    fi
else
    echo "❌ Virtual environment not found at /home/jaime/MyCode/src/CarCollection/backend/venv"
fi

echo
echo "🌐 Checking if backend server is running..."
if curl -s http://localhost:8000 >/dev/null 2>&1; then
    echo "✅ Backend server is running on port 8000"
else
    echo "❌ Backend server is NOT running on port 8000"
    echo "   Start with: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
fi

echo
echo "🌐 Checking if frontend server is running..."
if curl -s http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Frontend server is running on port 3000"
elif curl -s http://localhost:3001 >/dev/null 2>&1; then
    echo "✅ Frontend server is running on port 3001"
else
    echo "❌ Frontend server is NOT running"
    echo "   Start with: npm run dev"
fi

echo
echo "📁 Checking database..."
if [ -f "/home/jaime/MyCode/src/CarCollection/backend/car_collection.db" ]; then
    echo "✅ Database file exists"
    
    # Check if service_intervals table exists
    cd /home/jaime/MyCode/src/CarCollection/backend
    if sqlite3 car_collection.db "SELECT name FROM sqlite_master WHERE type='table' AND name='service_intervals';" | grep -q service_intervals; then
        echo "✅ Service intervals table exists"
        
        # Check if test data exists
        count=$(sqlite3 car_collection.db "SELECT COUNT(*) FROM service_intervals;")
        echo "📊 Service intervals in database: $count"
    else
        echo "❌ Service intervals table does NOT exist"
        echo "   Run: python3 add_service_intervals.py"
    fi
else
    echo "❌ Database file does NOT exist"
    echo "   Start the backend server first to create it"
fi

echo
echo "🔄 Next steps:"
echo "1. Install missing backend dependencies"
echo "2. Start backend server: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "3. Start frontend server: npm run dev"
echo "4. Navigate to http://localhost:3000 or http://localhost:3001"