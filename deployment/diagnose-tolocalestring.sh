#!/bin/bash

# Diagnose toLocaleString errors
echo "=== Diagnosing toLocaleString Errors ==="
echo ""

# Check if we can SSH to the server
SERVER_IP="93.127.194.202"
echo "1. Testing SSH connection to $SERVER_IP..."
echo "   Please enter SSH password when prompted"

# Run diagnostics on the server
ssh root@$SERVER_IP << 'EOF'
cd /opt/carcollection/car-collection-prototype

echo "2. Finding all toLocaleString calls in the dashboard..."
echo ""
echo "=== Dashboard page.tsx ==="
grep -n "toLocaleString" src/app/dashboard/page.tsx

echo ""
echo "3. Checking the current dashboard code around statistics..."
echo ""
echo "=== Lines 220-245 (Statistics display) ==="
sed -n '220,245p' src/app/dashboard/page.tsx | cat -n

echo ""
echo "4. Checking for date-related toLocaleString calls..."
echo ""
echo "=== Searching for date formatting ==="
grep -r "Date.*toLocaleString\|created.*toLocaleString\|updated.*toLocaleString" src/

echo ""
echo "5. Checking if there are any todos or recent activity widgets..."
echo ""
echo "=== Recent Activity Section (if any) ==="
grep -A5 -B5 "recent\|Recent\|activity\|Activity" src/app/dashboard/page.tsx | head -30

echo ""
echo "6. Testing API responses..."
echo ""
echo "=== Testing /api/cars response ==="
curl -s http://localhost:8000/api/cars/ | python3 -m json.tool | head -20 || echo "Failed to get cars"

echo ""
echo "=== Testing if there's a /api/dashboard or similar endpoint ==="
curl -s http://localhost:8000/api/dashboard/ -w "\nHTTP Status: %{http_code}\n" | head -20

echo ""
echo "7. Checking for any hardcoded test data or mock data..."
grep -r "toLocaleString" src/app/dashboard/ --include="*.ts" --include="*.tsx" | head -20

echo ""
echo "8. Looking for the actual minified error location..."
echo "The error is at position 6544 in the minified file"
echo ""
echo "=== Checking build output for clues ==="
if [ -f .next/server/app/dashboard/page.js ]; then
    echo "Found server-side dashboard build"
    # Try to find the area around character 6544
    head -c 7000 .next/server/app/dashboard/page.js | tail -c 1000 | grep -o '.{0,50}toLocaleString.{0,50}' || echo "No toLocaleString found in that range"
fi

EOF

echo ""
echo "=== Diagnostic Complete ==="
echo ""
echo "Based on the findings above, we can identify where the null value is coming from."