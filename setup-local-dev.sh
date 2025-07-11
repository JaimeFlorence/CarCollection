#!/bin/bash

echo "🚀 Setting up Car Collection for Local Development"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "car-collection-prototype" ]; then
    echo "Error: Please run this script from the CarCollection root directory"
    exit 1
fi

echo "1. Setting up Backend..."
echo "------------------------"
cd backend || exit 1

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
echo "Installing backend dependencies..."
pip install -r requirements.txt
pip install pydantic-settings==2.1.0

# Create local development .env
echo ""
echo "Creating backend .env for local development..."
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration - Allow local frontend
CORS_ORIGINS=["http://localhost:3000"]

# Application Settings
ENVIRONMENT=development
DEBUG=True

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=True

# Frontend URL
FRONTEND_URL=http://localhost:3000
EOF

# Initialize database if needed
if [ ! -f "car_collection.db" ]; then
    echo "Initializing database..."
    python init_db.py
    
    # Create test admin user
    python << 'PYTHON'
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()

# Check if admin exists
admin = db.query(User).filter(User.username == "admin").first()
if not admin:
    admin_user = User(
        username="admin",
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        is_admin=True
    )
    db.add(admin_user)
    db.commit()
    print("✓ Created local admin user: admin / admin123")
else:
    print("✓ Admin user already exists")

db.close()
PYTHON
fi

deactivate
cd ..

echo ""
echo "2. Setting up Frontend..."
echo "-------------------------"
cd car-collection-prototype || exit 1

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Create local development .env
echo ""
echo "Creating frontend .env.local for local development..."
cat > .env.local << 'EOF'
# API Configuration for local development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager (Local)
NEXT_PUBLIC_ENABLE_REGISTRATION=true
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

cd ..

echo ""
echo -e "${GREEN}✅ Local development setup complete!${NC}"
echo ""
echo "To run the application locally:"
echo "--------------------------------"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd car-collection-prototype"
echo "   npm run dev"
echo ""
echo "3. Access the application at: http://localhost:3000"
echo ""
echo "Local credentials:"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}Note: This setup is for local development only.${NC}"
echo "For production deployment, use the GitHub workflow."