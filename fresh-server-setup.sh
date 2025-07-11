#!/bin/bash

echo "🔄 Fresh Server Setup with Clean Database"
echo "========================================"
echo ""
echo "This script will:"
echo "1. Remove the existing database"
echo "2. Create a fresh database"
echo "3. Create only the Administrator account"
echo "4. Restart all services"
echo ""
echo "Run this ON THE SERVER at /opt/carcollection"
echo ""

# Safety check
if [ "$1" != "--confirm" ]; then
    echo "⚠️  WARNING: This will DELETE all existing data!"
    echo ""
    echo "To proceed, run: $0 --confirm"
    exit 1
fi

cd /opt/carcollection || exit 1

# Step 1: Stop services
echo "1. Stopping services..."
sudo systemctl stop carcollection-backend
sudo systemctl stop carcollection-frontend

# Step 2: Backup existing database (just in case)
if [ -f "backend/car_collection.db" ]; then
    echo ""
    echo "2. Backing up existing database..."
    mkdir -p backups
    cp backend/car_collection.db backups/car_collection_$(date +%Y%m%d_%H%M%S).db
    echo "   ✓ Database backed up to backups/"
fi

# Step 3: Remove old database
echo ""
echo "3. Removing old database..."
rm -f backend/car_collection.db
echo "   ✓ Old database removed"

# Step 4: Create fresh database
echo ""
echo "4. Creating fresh database..."
cd backend
source venv/bin/activate

# Initialize database
python init_db.py

# Create ONLY Administrator account
echo ""
echo "5. Creating Administrator account..."
python << 'EOF'
import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

db = SessionLocal()

# Create Administrator account
admin_user = User(
    username="Administrator",
    email="admin@example.com",
    hashed_password=get_password_hash("Tarzan7Jane"),
    is_admin=True
)
db.add(admin_user)
db.commit()

print("✓ Administrator account created successfully")
print("  Username: Administrator")
print("  Password: Tarzan7Jane")

# Verify it's the only user
user_count = db.query(User).count()
print(f"\nTotal users in database: {user_count}")

db.close()
EOF

deactivate
cd ..

# Step 5: Restart services
echo ""
echo "6. Starting services..."
sudo systemctl start carcollection-backend
sudo systemctl start carcollection-frontend

# Step 6: Wait for services to start
echo ""
echo "7. Waiting for services to start..."
sleep 5

# Step 7: Test login
echo ""
echo "8. Testing login..."
RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ✓ Login test successful!"
else
    echo "   ✗ Login test failed"
    echo "   Response: $RESPONSE"
fi

# Step 8: Final status check
echo ""
echo "9. Service status:"
echo "   Backend:  $(systemctl is-active carcollection-backend)"
echo "   Frontend: $(systemctl is-active carcollection-frontend)"
echo "   Nginx:    $(systemctl is-active nginx)"

echo ""
echo "========================================"
echo "✅ Fresh setup complete!"
echo ""
echo "Access the application at: http://93.127.194.202"
echo ""
echo "Login credentials:"
echo "  Username: Administrator"
echo "  Password: Tarzan7Jane"
echo ""
echo "This is now a completely fresh installation with no data."