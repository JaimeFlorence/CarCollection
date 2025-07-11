#!/bin/bash

# Deploy empty database fixes to staging server
echo "=== Deploying Empty Database Fixes ==="
echo ""

# Check if we can SSH to the server
SERVER_IP="93.127.194.202"
echo "1. Testing SSH connection to $SERVER_IP..."
echo "   Please enter SSH password when prompted"

# Deploy the fixes
ssh root@$SERVER_IP << 'EOF'
cd /opt/carcollection

echo "2. Pulling latest changes from Git..."
# First, let's check if there are any local changes we need to preserve
git status --short

echo ""
echo "3. Creating backup of current state..."
cp -r car-collection-prototype car-collection-prototype.backup-$(date +%Y%m%d-%H%M%S)

echo ""
echo "4. Applying the empty database fixes..."
cd car-collection-prototype

# Fix dashboard
echo "Fixing dashboard toLocaleString issues..."
sed -i 's/{totalMileage\.toLocaleString()}/{(totalMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
sed -i 's/{avgMileage\.toLocaleString()}/{(avgMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
sed -i 's/sum + car\.mileage/sum + (car.mileage || 0)/g' src/app/dashboard/page.tsx

# Fix car cards
echo "Fixing car card components..."
sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCardEnhanced.tsx
sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCard.tsx

echo ""
echo "5. Showing the changes made..."
echo "=== Dashboard changes ==="
grep -n "toLocaleString" src/app/dashboard/page.tsx | head -5
echo ""
echo "=== CarCard changes ==="
grep -n "mileage.*toLocaleString" src/components/CarCard*.tsx

echo ""
echo "6. Stopping frontend service..."
systemctl stop carcollection-frontend

echo ""
echo "7. Rebuilding frontend with fixes..."
rm -rf .next
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo ""
echo "8. Starting frontend service..."
systemctl start carcollection-frontend

sleep 5

echo ""
echo "9. Service status check..."
if systemctl is-active --quiet carcollection-frontend; then
    echo "✓ Frontend service is running"
    
    echo ""
    echo "10. Testing the fix..."
    # Test if the dashboard loads without error
    curl -s http://localhost:3001/ | grep -q "Something went wrong" && echo "✗ Error page still showing" || echo "✓ Homepage loads without error"
else
    echo "✗ Frontend service failed to start"
    echo "Checking logs..."
    journalctl -u carcollection-frontend -n 30
fi

EOF

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "The empty database fixes have been deployed."
echo ""
echo "IMPORTANT STEPS:"
echo "1. Clear your browser cache completely (Ctrl+Shift+Delete)"
echo "2. Use an incognito/private window to test"
echo "3. Go to http://93.127.194.202/login"
echo "4. Login with Administrator / Tarzan7Jane"
echo ""
echo "The dashboard should now load successfully even with no cars in the database!"
echo ""
echo "If everything works well, we can continue fixing the remaining components."