#!/bin/bash

# Deploy empty database fixes to staging server
echo "=== Deploying Empty Database Fixes to Staging ==="
echo ""
echo "This script will deploy the fix-empty-database-issues branch to staging"
echo ""

# Check if we can SSH to the server
SERVER_IP="93.127.194.202"
echo "1. Testing SSH connection to $SERVER_IP..."
echo "   Please enter SSH password when prompted"

# Deploy the fixes
ssh root@$SERVER_IP << 'EOF'
set -e  # Exit on any error

cd /opt/carcollection

echo ""
echo "2. Current server status..."
systemctl status carcollection-backend --no-pager | head -5 || true
systemctl status carcollection-frontend --no-pager | head -5 || true

echo ""
echo "3. Creating backup of current state..."
BACKUP_DIR="/opt/carcollection/backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r car-collection-prototype "$BACKUP_DIR/"
cp -r backend/car_collection.db "$BACKUP_DIR/" 2>/dev/null || true
echo "✓ Backup created at: $BACKUP_DIR"

echo ""
echo "4. Stopping services..."
systemctl stop carcollection-frontend carcollection-backend

echo ""
echo "5. Applying the empty database fixes..."
cd car-collection-prototype

# Apply all the fixes from our branch
echo "   Fixing dashboard..."
sed -i 's/{totalMileage\.toLocaleString()}/{(totalMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
sed -i 's/{avgMileage\.toLocaleString()}/{(avgMileage || 0).toLocaleString()}/g' src/app/dashboard/page.tsx
sed -i 's/sum + car\.mileage/sum + (car.mileage || 0)/g' src/app/dashboard/page.tsx

echo "   Fixing car cards..."
sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCardEnhanced.tsx
sed -i 's/{car\.mileage\.toLocaleString()}/{(car.mileage || 0).toLocaleString()}/g' src/components/CarCard.tsx

echo "   Fixing service intervals..."
# Fix array access
sed -i '/\.sort((a, b) => new Date(b\.performed_date)\.getTime() - new Date(a\.performed_date)\.getTime())\[0\];/c\
      const filteredHistory = history\
        .filter(h => h.service_item === interval.service_item)\
        .sort((a, b) => new Date(b.performed_date).getTime() - new Date(a.performed_date).getTime());\
      const recentService = filteredHistory.length > 0 ? filteredHistory[0] : null;' src/components/ServiceIntervalList.tsx

# Fix string splits
sed -i 's/parseInt(nextDueByMiles\.split.*$/const milesParts = nextDueByMiles.split('\'' '\'');\
        const milesRemaining = milesParts.length > 0 ? parseInt(milesParts[0].replace(\/,\/g, '\''\'')) : 0;/' src/components/ServiceIntervalList.tsx
sed -i 's/parseInt(nextDueByDate\.split.*$/const dateParts = nextDueByDate.split('\'' '\'');\
        const monthsRemaining = dateParts.length > 0 ? parseInt(dateParts[0]) : 0;/' src/components/ServiceIntervalList.tsx

echo "   Fixing session manager..."
# Fix JWT parsing
sed -i '/const payload = JSON\.parse(atob(token\.split/,/^[[:space:]]*$/d' src/components/SessionManager.tsx
sed -i '/JWT structure: header\.payload\.signature/a\
      const parts = token.split('\''.'\'');\
      if (parts.length !== 3) {\
        console.error('\''Invalid JWT token format'\'');\
        return null;\
      }\
      const payload = JSON.parse(atob(parts[1]));' src/components/SessionManager.tsx

echo "   Fixing service entry dialog..."
sed -i 's/parseFloat(formData\.cost)\.toFixed/parseFloat(formData.cost || '\''0'\'').toFixed/g' src/components/ServiceEntryDialog.tsx

echo "   Fixing car detail page..."
sed -i 's/{new Date(f\.date)\.toLocaleDateString()}/{f.date ? new Date(f.date).toLocaleDateString() : '\''N\/A'\''}/g' src/app/cars/[id]/page.tsx
sed -i 's/{new Date(r\.date)\.toLocaleDateString()}/{r.date ? new Date(r.date).toLocaleDateString() : '\''N\/A'\''}/g' src/app/cars/[id]/page.tsx

echo "✓ All fixes applied"

echo ""
echo "6. Rebuilding frontend..."
rm -rf .next
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
npm run build

echo ""
echo "7. Starting services..."
systemctl start carcollection-backend
sleep 3
systemctl start carcollection-frontend

echo ""
echo "8. Verifying deployment..."
sleep 5

# Check if services are running
if systemctl is-active --quiet carcollection-backend && systemctl is-active --quiet carcollection-frontend; then
    echo "✓ Both services are running"
    
    # Test if homepage loads
    if curl -s http://localhost:3001/ | grep -q "Car Collection Manager"; then
        echo "✓ Frontend is responding"
    else
        echo "✗ Frontend not responding properly"
    fi
    
    # Test if API is accessible
    if curl -s http://localhost:8000/api/ > /dev/null; then
        echo "✓ Backend API is responding"
    else
        echo "✗ Backend API not responding"
    fi
else
    echo "✗ One or more services failed to start"
    echo ""
    echo "Backend status:"
    systemctl status carcollection-backend --no-pager | head -10
    echo ""
    echo "Frontend status:"
    systemctl status carcollection-frontend --no-pager | head -10
fi

echo ""
echo "9. Recent logs..."
echo "Backend logs:"
journalctl -u carcollection-backend -n 10 --no-pager
echo ""
echo "Frontend logs:"
journalctl -u carcollection-frontend -n 10 --no-pager

EOF

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "The empty database fixes have been deployed to staging."
echo ""
echo "IMPORTANT: Clear your browser cache before testing!"
echo ""
echo "Test the deployment:"
echo "1. Go to http://93.127.194.202/login"
echo "2. Login with: Administrator / Tarzan7Jane"
echo "3. Verify the dashboard loads without errors"
echo "4. The statistics should show all zeros"
echo "5. Try adding a car to ensure normal functionality works"
echo ""
echo "If there are any issues, you can restore the backup from the server."