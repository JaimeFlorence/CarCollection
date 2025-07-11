#!/bin/bash
# Debug frontend admin page issues

cat << 'EOF' > /tmp/debug-admin-frontend.sh
#!/bin/bash
echo "=== Debugging Admin Frontend Issues ==="

cd /opt/carcollection/car-collection-prototype

echo "1. Checking for localhost in built JavaScript files..."
echo "Searching for hardcoded localhost:8000..."
find .next -name "*.js" -type f -exec grep -l "localhost:8000" {} \; 2>/dev/null | head -10

echo -e "\n2. Checking the actual API URL in the built files..."
# Look for where axios is configured
echo "Looking for axios baseURL configuration..."
grep -r "baseURL.*http" .next/static/chunks/ 2>/dev/null | head -5 || echo "No direct baseURL found"

echo -e "\n3. Checking environment variable usage in build..."
grep -r "NEXT_PUBLIC_API_URL" .next/ 2>/dev/null | head -5 || echo "No NEXT_PUBLIC_API_URL found in build"

echo -e "\n4. Let's check the actual running process environment..."
FRONTEND_PID=$(systemctl show -p MainPID carcollection-frontend | cut -d= -f2)
if [ -n "$FRONTEND_PID" ] && [ "$FRONTEND_PID" != "0" ]; then
    echo "Frontend process PID: $FRONTEND_PID"
    echo "Environment variables:"
    cat /proc/$FRONTEND_PID/environ 2>/dev/null | tr '\0' '\n' | grep -E "(API|NODE_ENV|PORT)" || echo "Could not read process environment"
fi

echo -e "\n5. Creating a test HTML page to debug axios..."
cat > /tmp/test-api.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
    <title>API Test</title>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <h1>Testing Admin API</h1>
    <button onclick="testAPI()">Test API</button>
    <pre id="output"></pre>
    
    <script>
    async function testAPI() {
        const output = document.getElementById('output');
        output.textContent = 'Testing...\n';
        
        try {
            // First login
            const loginResp = await axios.post('http://93.127.194.202/auth/login', {
                username: 'Administrator',
                password: 'Tarzan7Jane'
            });
            output.textContent += 'Login successful\n';
            const token = loginResp.data.access_token;
            
            // Then get users
            const usersResp = await axios.get('http://93.127.194.202/admin/users/', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            output.textContent += `Got ${usersResp.data.length} users:\n`;
            output.textContent += JSON.stringify(usersResp.data, null, 2);
        } catch (error) {
            output.textContent += `Error: ${error.message}\n`;
            if (error.response) {
                output.textContent += `Status: ${error.response.status}\n`;
                output.textContent += `Data: ${JSON.stringify(error.response.data)}\n`;
            }
        }
    }
    </script>
</body>
</html>
HTMLEOF

echo "Test page created at: /tmp/test-api.html"
echo "You can serve it with: python3 -m http.server 8080 --directory /tmp"

echo -e "\n6. Let's trace what happens when we access the admin page..."
echo "Checking recent frontend logs for errors..."
journalctl -u carcollection-frontend -n 50 --no-pager | grep -E "(error|Error|ERROR|admin|Admin)" | tail -10

echo -e "\n7. Rebuilding with explicit environment variable..."
echo "Stopping frontend service..."
systemctl stop carcollection-frontend

echo "Setting environment and rebuilding..."
export NEXT_PUBLIC_API_URL="http://93.127.194.202"
echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# Clean cache
rm -rf .next/cache

echo "Building..."
npm run build 2>&1 | grep -E "(Compiled|Error|warn|fail)" || echo "Build output suppressed"

echo "Starting frontend service..."
systemctl start carcollection-frontend
sleep 5

echo "Service status:"
systemctl status carcollection-frontend --no-pager | grep Active

echo -e "\n=== Debug Complete ==="
echo "Please try accessing http://93.127.194.202/admin again"
EOF

SERVER_IP="93.127.194.202"
SERVER_USER="root"

echo "Copying debug script to staging..."
scp /tmp/debug-admin-frontend.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "Running debug script on staging..."
ssh ${SERVER_USER}@${SERVER_IP} "bash /tmp/debug-admin-frontend.sh"