#!/bin/bash

echo "🔍 Car Collection Login Diagnostics"
echo "==================================="
echo "Generated: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check command result
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
    fi
}

echo -e "${BLUE}1. System Information${NC}"
echo "------------------------"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -I | awk '{print $1}')"
echo "OS: $(lsb_release -d 2>/dev/null | cut -f2 || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo ""

echo -e "${BLUE}2. Service Status${NC}"
echo "-----------------"
echo -n "Backend service: "
systemctl is-active carcollection-backend 2>/dev/null || echo "not found"
echo -n "Frontend service: "
systemctl is-active carcollection-frontend 2>/dev/null || echo "not found"
echo -n "Nginx service: "
systemctl is-active nginx 2>/dev/null || echo "not found"
echo ""

echo -e "${BLUE}3. Port Listening Status${NC}"
echo "------------------------"
echo "Checking ports..."
sudo ss -tlnp | grep -E ':8000|:3001|:80' | while read line; do
    echo "  $line"
done
echo ""

echo -e "${BLUE}4. Backend Configuration${NC}"
echo "------------------------"
if [ -f "/opt/carcollection/backend/.env" ]; then
    echo "Backend .env file exists"
    echo "Key configurations:"
    grep -E "^(CORS_ORIGINS|DATABASE_URL|SECRET_KEY|FRONTEND_URL)" /opt/carcollection/backend/.env | sed 's/SECRET_KEY=.*/SECRET_KEY=<hidden>/'
else
    echo -e "${RED}Backend .env file NOT FOUND${NC}"
fi
echo ""

echo -e "${BLUE}5. Frontend Configuration${NC}"
echo "-------------------------"
if [ -f "/opt/carcollection/car-collection-prototype/.env.local" ]; then
    echo "Frontend .env.local file exists"
    echo "Contents:"
    cat /opt/carcollection/car-collection-prototype/.env.local
else
    echo -e "${RED}Frontend .env.local file NOT FOUND${NC}"
fi
echo ""

echo -e "${BLUE}6. Nginx Configuration${NC}"
echo "----------------------"
if [ -f "/etc/nginx/sites-enabled/carcollection" ]; then
    echo "Nginx config exists"
    echo "Proxy settings:"
    grep -E "proxy_pass|server_name|listen" /etc/nginx/sites-enabled/carcollection | grep -v "^#" | head -10
else
    echo -e "${RED}Nginx config NOT FOUND${NC}"
fi
echo ""

echo -e "${BLUE}7. API Endpoint Tests${NC}"
echo "---------------------"
echo -n "Testing backend directly (localhost:8000): "
curl -s -f -m 5 http://localhost:8000/docs > /dev/null 2>&1
check_result

echo -n "Testing backend through nginx (/api): "
curl -s -f -m 5 http://localhost/api/docs > /dev/null 2>&1
check_result

echo -n "Testing frontend (port 3001): "
curl -s -f -m 5 http://localhost:3001 > /dev/null 2>&1
check_result

echo -n "Testing login endpoint directly: "
LOGIN_RESPONSE=$(curl -s -m 5 -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "admin123"}' 2>&1)
if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Login successful${NC}"
else
    echo -e "${RED}✗ Login failed${NC}"
    echo "  Response: ${LOGIN_RESPONSE:0:100}..."
fi
echo ""

echo -e "${BLUE}8. Recent Service Logs${NC}"
echo "----------------------"
echo "Backend logs (last 10 lines):"
sudo journalctl -u carcollection-backend -n 10 --no-pager 2>/dev/null | tail -5 || echo "  No logs available"
echo ""
echo "Frontend logs (last 10 lines):"
sudo journalctl -u carcollection-frontend -n 10 --no-pager 2>/dev/null | tail -5 || echo "  No logs available"
echo ""

echo -e "${BLUE}9. Frontend Build Check${NC}"
echo "-----------------------"
if [ -d "/opt/carcollection/car-collection-prototype/.next" ]; then
    echo "Next.js build directory exists"
    echo -n "Build date: "
    stat -c %y /opt/carcollection/car-collection-prototype/.next 2>/dev/null | cut -d' ' -f1 || echo "unknown"
else
    echo -e "${RED}.next build directory NOT FOUND${NC}"
fi
echo ""

echo -e "${BLUE}10. Process Check${NC}"
echo "-----------------"
echo "Node processes:"
ps aux | grep -E "node|next" | grep -v grep | head -3
echo ""
echo "Python processes:"
ps aux | grep -E "uvicorn|gunicorn|python" | grep -v grep | head -3
echo ""

echo -e "${BLUE}11. Network Connectivity${NC}"
echo "------------------------"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -n "Testing external access to http://$SERVER_IP: "
timeout 5 curl -s -o /dev/null -w "%{http_code}" http://$SERVER_IP || echo "timeout"
echo ""

echo -e "${BLUE}12. Frontend API Configuration Check${NC}"
echo "------------------------------------"
if [ -f "/opt/carcollection/car-collection-prototype/.next/server/app/login/page.js" ]; then
    echo "Checking compiled API URL in build:"
    grep -o "NEXT_PUBLIC_API_URL[^\"]*" /opt/carcollection/car-collection-prototype/.next/server/app/login/page.js 2>/dev/null | head -1 || echo "  Not found in build"
fi
echo ""

echo -e "${BLUE}13. Quick Diagnostics Summary${NC}"
echo "-----------------------------"
ISSUES=0

# Check 1: Services running
if ! systemctl is-active --quiet carcollection-backend 2>/dev/null; then
    echo -e "${RED}❌ Backend service not running${NC}"
    ((ISSUES++))
fi

if ! systemctl is-active --quiet carcollection-frontend 2>/dev/null; then
    echo -e "${RED}❌ Frontend service not running${NC}"
    ((ISSUES++))
fi

# Check 2: Ports listening
if ! sudo ss -tlnp | grep -q ":8000"; then
    echo -e "${RED}❌ Backend not listening on port 8000${NC}"
    ((ISSUES++))
fi

if ! sudo ss -tlnp | grep -q ":3001"; then
    echo -e "${RED}❌ Frontend not listening on port 3001${NC}"
    ((ISSUES++))
fi

# Check 3: Configuration files
if [ ! -f "/opt/carcollection/car-collection-prototype/.env.local" ]; then
    echo -e "${RED}❌ Frontend .env.local missing${NC}"
    ((ISSUES++))
fi

# Check 4: API URL configuration
if [ -f "/opt/carcollection/car-collection-prototype/.env.local" ]; then
    if ! grep -q "NEXT_PUBLIC_API_URL=http://$SERVER_IP/api" /opt/carcollection/car-collection-prototype/.env.local; then
        echo -e "${YELLOW}⚠️  Frontend API URL may be incorrect${NC}"
        ((ISSUES++))
    fi
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All basic checks passed${NC}"
else
    echo -e "${RED}Found $ISSUES potential issues${NC}"
fi

echo ""
echo -e "${BLUE}14. Recommended Actions${NC}"
echo "-----------------------"
if [ $ISSUES -gt 0 ]; then
    echo "1. Run the quick fix:"
    echo "   curl -s https://raw.githubusercontent.com/yourusername/CarCollection/main/deployment/quick-fix.sh | bash"
    echo ""
    echo "2. Or manually fix:"
    echo "   cd /opt/carcollection"
    echo "   ./deployment/fix-deployment.sh"
fi

echo ""
echo "📋 To share this report:"
echo "   $0 > diagnosis.txt"
echo "   cat diagnosis.txt"
echo ""
echo "Diagnostics complete!"