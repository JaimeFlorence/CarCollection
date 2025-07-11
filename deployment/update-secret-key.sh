#!/bin/bash

# Update SECRET_KEY in backend configuration
echo "=== Updating SECRET_KEY Configuration ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "ERROR: This script must be run as root (use sudo)"
   exit 1
fi

# Your SECRET_KEY from DEPLOYMENT.md
SECRET_KEY="1d247327682c9061e369ed897a62970e350bf63a53304e6b407feacba202d635"

cd /opt/carcollection/backend

echo "1. Checking current .env file..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
    
    # Check if SECRET_KEY is already set
    if grep -q "^SECRET_KEY=" .env; then
        CURRENT_KEY=$(grep "^SECRET_KEY=" .env | cut -d'=' -f2)
        echo "Current SECRET_KEY: ${CURRENT_KEY:0:20}..."
        
        if [ "$CURRENT_KEY" != "$SECRET_KEY" ]; then
            echo "⚠️  SECRET_KEY needs to be updated"
        else
            echo "✓ SECRET_KEY is already correctly set"
        fi
    else
        echo "⚠️  No SECRET_KEY found in .env"
    fi
else
    echo "✗ No .env file found - creating one"
fi

echo ""
echo "2. Backing up current .env..."
cp .env .env.backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

echo ""
echo "3. Updating/Creating .env with correct configuration..."

# Create or update .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL=sqlite:///./car_collection.db

# Security Configuration
SECRET_KEY=$SECRET_KEY
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4

# CORS Configuration - IMPORTANT: Use proper JSON array format
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

echo "✓ .env file updated with correct SECRET_KEY"

# Set proper permissions
chown carcollection:carcollection .env
chmod 600 .env

echo ""
echo "4. Verifying configuration..."
python3 << 'EOF'
import os
import sys
sys.path.insert(0, '.')

try:
    from app.config import settings
    
    print(f"✓ Configuration loaded successfully")
    print(f"  - Environment: {settings.environment}")
    print(f"  - Secret key present: {'Yes' if settings.secret_key else 'No'}")
    print(f"  - Secret key length: {len(settings.secret_key) if settings.secret_key else 0}")
    print(f"  - CORS origins: {settings.cors_origins}")
    print(f"  - JWT algorithm: {settings.jwt_algorithm}")
    print(f"  - JWT expiration: {settings.jwt_expiration_hours} hours")
    
except Exception as e:
    print(f"✗ Error loading configuration: {e}")
    import traceback
    traceback.print_exc()
EOF

echo ""
echo "5. Restarting backend service..."
systemctl restart carcollection-backend

sleep 3

echo ""
echo "6. Checking service status..."
if systemctl is-active --quiet carcollection-backend; then
    echo "✓ Backend service is running"
    
    # Test authentication
    echo ""
    echo "7. Testing authentication with new SECRET_KEY..."
    
    LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:8000/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
    BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE:")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✓ Authentication working with new SECRET_KEY"
        
        # Extract and verify token
        TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            echo "✓ JWT token generated successfully"
            
            # Test an authenticated endpoint
            echo ""
            echo "8. Testing authenticated endpoint..."
            CARS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/cars \
                -H "Authorization: Bearer $TOKEN")
            
            if [ "$CARS_CODE" = "200" ]; then
                echo "✓ Authenticated API calls working"
            else
                echo "⚠️  API call returned: $CARS_CODE"
            fi
        fi
    else
        echo "✗ Authentication failed with HTTP $HTTP_CODE"
        echo "Response: $BODY"
    fi
else
    echo "✗ Backend service failed to start"
    echo "Check logs: journalctl -u carcollection-backend -n 50"
fi

echo ""
echo "=== Update Complete ==="
echo ""
echo "Your SECRET_KEY has been properly configured."
echo "All existing login sessions will need to re-authenticate."
echo ""
echo "Try logging in again at http://93.127.194.202"