#!/bin/bash

echo "🚀 Preparing Car Collection for Clean Deployment"
echo "=============================================="
echo ""

# This script prepares the application for deployment with:
# - Fresh database with only Administrator account
# - Proper environment configuration
# - No localhost references

cd /opt/carcollection || exit 1

# Step 1: Stop all services
echo "1. Stopping all services..."
sudo systemctl stop carcollection-backend
sudo systemctl stop carcollection-frontend

# Step 2: Backup existing database (just in case)
echo ""
echo "2. Backing up existing database..."
if [ -f "backend/car_collection.db" ]; then
    cp backend/car_collection.db backend/car_collection.db.backup.$(date +%Y%m%d_%H%M%S)
    echo "   ✓ Database backed up"
fi

# Step 3: Create fresh database
echo ""
echo "3. Creating fresh database..."
cd backend
rm -f car_collection.db

# Initialize database
source venv/bin/activate
python init_db.py

# Create ONLY the Administrator account
echo ""
echo "4. Creating Administrator account..."
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
    email="admin@example.com",  # Using valid email format
    hashed_password=get_password_hash("Tarzan7Jane"),
    is_admin=True
)
db.add(admin_user)
db.commit()

print("✓ Administrator account created")
print("  Username: Administrator")
print("  Password: Tarzan7Jane")
print("  Email: admin@example.com")

# Verify it's the only user
user_count = db.query(User).count()
print(f"\nTotal users in database: {user_count}")

db.close()
EOF

deactivate
cd ..

# Step 4: Set up proper environment files
echo ""
echo "5. Setting up environment configuration..."

# Backend environment
cat > backend/.env << 'EOF'
# Database Configuration
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration - IMPORTANT: Use JSON array format
CORS_ORIGINS=["http://93.127.194.202"]

# Application Settings
ENVIRONMENT=production
DEBUG=False

# Invitation Settings
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False

# Frontend URL
FRONTEND_URL=http://93.127.194.202
EOF

echo "   ✓ Backend .env created"

# Frontend environment
cd car-collection-prototype
cat > .env.production << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://93.127.194.202

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

echo "   ✓ Frontend .env.production created"

# Step 5: Ensure no localhost references
echo ""
echo "6. Verifying no localhost references..."
if grep -r "localhost:8000" src/ 2>/dev/null | grep -v node_modules; then
    echo "   ⚠️  Found localhost references - fixing..."
    find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
        -exec sed -i 's|http://localhost:8000|process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"|g' {} +
else
    echo "   ✓ No hardcoded localhost references found"
fi

# Step 6: Clean rebuild
echo ""
echo "7. Clean rebuild of frontend..."
rm -rf .next
rm -rf node_modules/.cache
npm run build

cd ..

# Step 7: Update nginx configuration
echo ""
echo "8. Updating nginx configuration..."
sudo tee /etc/nginx/sites-available/carcollection > /dev/null << 'EOF'
server {
    listen 80;
    server_name 93.127.194.202;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Auth endpoints
    location /auth/ {
        proxy_pass http://localhost:8000/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Step 8: Restart all services
echo ""
echo "9. Starting all services..."
sudo systemctl daemon-reload
sudo systemctl restart nginx
sudo systemctl start carcollection-backend
sudo systemctl start carcollection-frontend

# Step 9: Wait for services to start
echo ""
echo "10. Waiting for services to start..."
sleep 10

# Step 10: Verify everything is working
echo ""
echo "11. Verifying deployment..."
echo -n "   Backend: "
systemctl is-active carcollection-backend

echo -n "   Frontend: "
systemctl is-active carcollection-frontend

echo -n "   Nginx: "
systemctl is-active nginx

# Test login
echo ""
echo "12. Testing login endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)

if echo "$RESPONSE" | grep -q "access_token"; then
    echo "   ✓ Login endpoint working!"
else
    echo "   ✗ Login endpoint failed"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "=============================================="
echo "✅ Deployment preparation complete!"
echo ""
echo "Fresh database created with single account:"
echo "  Username: Administrator"
echo "  Password: Tarzan7Jane"
echo ""
echo "Application URL: http://93.127.194.202"
echo ""
echo "Next steps:"
echo "1. Test login in browser (use incognito mode)"
echo "2. Create user invitations as needed"
echo "3. Set up SSL certificate when domain is ready"