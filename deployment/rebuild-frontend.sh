#!/bin/bash

# Rebuild frontend with correct API URL
echo "=== Rebuilding Frontend ==="
echo "This will fix the localhost references in the frontend"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
   echo "ERROR: This script must be run as root (use sudo)"
   exit 1
fi

cd /opt/carcollection/car-collection-prototype

echo "1. Checking current environment configuration..."
echo "Current .env.production:"
cat .env.production
echo ""

echo "2. Ensuring environment variables are set correctly..."
cat > .env.production << 'EOF'
# API Configuration
NEXT_PUBLIC_API_URL=http://93.127.194.202

# Application Settings
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
EOF

echo "✓ Environment file updated"

echo ""
echo "3. Checking for hardcoded localhost references in source..."
grep -r "localhost:8000" src/lib/ 2>/dev/null | grep -v node_modules || echo "✓ No hardcoded localhost in src/lib"

echo ""
echo "4. Stopping frontend service..."
systemctl stop carcollection-frontend

echo ""
echo "5. Cleaning previous build..."
rm -rf .next
rm -rf out

echo ""
echo "6. Installing dependencies (in case any are missing)..."
npm install

echo ""
echo "7. Building frontend with production configuration..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

# Build with production env
npm run build

echo ""
echo "8. Checking build output for localhost references..."
if grep -r "localhost:8000" .next 2>/dev/null | head -5; then
    echo "⚠️ WARNING: Still found localhost references after build!"
    echo ""
    echo "9. Checking api.ts file..."
    if [ -f "src/lib/api.ts" ]; then
        echo "Current API_BASE_URL in api.ts:"
        grep -n "API_BASE_URL" src/lib/api.ts | head -5
        
        echo ""
        echo "10. Fixing api.ts to use environment variable..."
        # Backup original
        cp src/lib/api.ts src/lib/api.ts.backup
        
        # Fix the API_BASE_URL
        sed -i 's|const API_BASE_URL = .*|const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";|' src/lib/api.ts
        
        echo "✓ Fixed api.ts"
        echo ""
        echo "11. Rebuilding with fixed api.ts..."
        npm run build
    fi
else
    echo "✓ No localhost references found in build!"
fi

echo ""
echo "12. Setting permissions..."
chown -R carcollection:carcollection /opt/carcollection/car-collection-prototype

echo ""
echo "13. Starting frontend service..."
systemctl start carcollection-frontend

sleep 3

echo ""
echo "14. Checking service status..."
if systemctl is-active --quiet carcollection-frontend; then
    echo "✓ Frontend service is running"
else
    echo "✗ Frontend service failed to start"
    echo "Error logs:"
    journalctl -u carcollection-frontend -n 20 --no-pager
fi

echo ""
echo "15. Final verification..."
echo "Testing if frontend can reach backend:"
curl -s -o /dev/null -w "Frontend (port 3001): %{http_code}\n" http://localhost:3001
curl -s -o /dev/null -w "Backend health: %{http_code}\n" http://localhost:8000/auth/login

echo ""
echo "=== Rebuild Complete ==="
echo ""
echo "The frontend has been rebuilt with the correct API URL."
echo "Try creating a car again at http://93.127.194.202"
echo ""
echo "If it still doesn't work:"
echo "1. Clear your browser cache (Ctrl+Shift+R)"
echo "2. Try in an incognito/private window"
echo "3. Check the browser console for any remaining errors"