#!/bin/bash

echo "=== Testing Empty Database Fixes Locally ==="
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
if [ "$CURRENT_BRANCH" != "fix-empty-database-issues" ]; then
    echo "WARNING: Not on fix-empty-database-issues branch!"
fi
echo ""

# Create a fresh test database
echo "1. Creating fresh test database with only Administrator account..."
cd backend

# Activate virtual environment if it exists
if [ -f venv/bin/activate ]; then
    echo "   Activating virtual environment..."
    source venv/bin/activate
fi

# Backup existing database if it exists
if [ -f car_collection.db ]; then
    echo "   Backing up existing database..."
    cp car_collection.db car_collection.db.backup-$(date +%Y%m%d-%H%M%S)
fi

# Create fresh database
echo "   Creating new empty database..."
rm -f car_collection.db
python3 init_db.py

# Create Administrator account
echo "   Creating Administrator account..."
python3 << 'EOF'
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()
try:
    # Check if admin already exists
    existing = db.query(User).filter(User.username == "Administrator").first()
    if not existing:
        admin_user = User(
            username="Administrator",
            email="admin@example.com",
            hashed_password=get_password_hash("Tarzan7Jane"),
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        print("✓ Administrator account created")
    else:
        print("✓ Administrator account already exists")
except Exception as e:
    print(f"✗ Error creating admin: {e}")
finally:
    db.close()
EOF

echo ""
echo "2. Starting backend server..."
# Kill any existing backend process
pkill -f "uvicorn app.main:app" 2>/dev/null

# Start backend in background
echo "   Starting FastAPI backend on http://localhost:8000"
nohup uvicorn app.main:app --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "   Waiting for backend to start..."
sleep 5

# Check if backend is running
if wget -q -O /dev/null http://localhost:8000/api/; then
    echo "✓ Backend is running"
else
    echo "✗ Backend failed to start. Check backend.log"
    tail -10 backend.log
    exit 1
fi

echo ""
echo "3. Starting frontend server..."
cd ../car-collection-prototype

# Kill any existing frontend process
pkill -f "next dev" 2>/dev/null

# Build and start frontend
echo "   Building frontend..."
npm run build

echo "   Starting Next.js frontend on http://localhost:3000"
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "   Waiting for frontend to start..."
sleep 10

echo ""
echo "=== Local Test Environment Ready ==="
echo ""
echo "Backend running at: http://localhost:8000"
echo "Frontend running at: http://localhost:3000"
echo ""
echo "TEST STEPS:"
echo "1. Open http://localhost:3000/login in your browser"
echo "2. Login with: Administrator / Tarzan7Jane"
echo "3. Verify the dashboard loads without errors"
echo "4. Check browser console for any JavaScript errors"
echo ""
echo "To stop the servers:"
echo "  kill $BACKEND_PID   # Stop backend"
echo "  kill $FRONTEND_PID  # Stop frontend"
echo ""
echo "Or use: pkill -f 'uvicorn|next dev'"
echo ""
echo "Backend logs: backend/backend.log"
echo "Frontend logs: car-collection-prototype/frontend.log"