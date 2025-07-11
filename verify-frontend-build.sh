#!/bin/bash
# Verify and fix frontend build on staging

cat << 'EOF' > /tmp/verify-frontend.sh
#!/bin/bash
echo "=== Verifying Frontend Build ==="

cd /opt/carcollection/car-collection-prototype

echo "1. Checking current axiosClient.ts..."
grep -n "API_BASE_URL" src/lib/axiosClient.ts

echo -e "\n2. Checking if .env.production exists..."
if [ -f .env.production ]; then
    cat .env.production
else
    echo ".env.production not found!"
fi

echo -e "\n3. Checking built files for localhost references..."
echo "Searching in .next directory..."
grep -r "localhost:8000" .next/ 2>/dev/null | head -5 || echo "No localhost references found in build"

echo -e "\n4. Checking if we need to rebuild..."
if grep -q "localhost:8000" .next/; then
    echo "Found localhost references in build. Rebuilding..."
    
    # Ensure .env.production is correct
    cat > .env.production << 'ENVEOF'
# Production environment variables
NEXT_PUBLIC_API_URL=http://93.127.194.202
ENVEOF
    
    # Clean and rebuild
    echo "Cleaning old build..."
    rm -rf .next
    
    echo "Building with production environment..."
    npm run build
    
    echo "Restarting frontend service..."
    systemctl restart carcollection-frontend
    
    echo "Waiting for service to start..."
    sleep 5
    
    echo "Service status:"
    systemctl status carcollection-frontend --no-pager | grep Active
else
    echo "Build appears to be correct."
fi

echo -e "\n5. Testing the API URL in the running app..."
# Get the actual built file that contains the API URL
CHUNK_FILE=$(find .next/static/chunks -name "*.js" -exec grep -l "axios.*create" {} \; | head -1)
if [ -n "$CHUNK_FILE" ]; then
    echo "Checking API URL in built chunk: $CHUNK_FILE"
    grep -o "baseURL:[^,]*" "$CHUNK_FILE" | head -5
fi

echo -e "\n=== Verification Complete ==="
EOF

SERVER_IP="93.127.194.202"
SERVER_USER="root"

echo "Copying verification script to staging..."
scp /tmp/verify-frontend.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "Running verification on staging..."
ssh ${SERVER_USER}@${SERVER_IP} "bash /tmp/verify-frontend.sh"