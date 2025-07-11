#!/bin/bash

# Complete diagnostic of the system
echo "=== Full System Diagnostic ==="
echo "Date: $(date)"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Service Status${NC}"
echo -n "Backend: "
systemctl is-active carcollection-backend || echo "NOT RUNNING"
echo -n "Frontend: "
systemctl is-active carcollection-frontend || echo "NOT RUNNING"
echo -n "Nginx: "
systemctl is-active nginx || echo "NOT RUNNING"

echo ""
echo -e "${YELLOW}2. Port Checks${NC}"
echo "Listening ports:"
ss -tlnp | grep -E ':80|:3001|:8000' || echo "No services on expected ports"

echo ""
echo -e "${YELLOW}3. Testing Backend API${NC}"
echo -n "Backend health: "
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/docs || echo "FAILED"

echo -n "Login endpoint: "
LOGIN_RESP=$(curl -s -w "\nSTATUS:%{http_code}" -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "Administrator", "password": "Tarzan7Jane"}')
STATUS=$(echo "$LOGIN_RESP" | grep "STATUS:" | cut -d: -f2)
echo $STATUS

if [ "$STATUS" = "200" ]; then
    TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    echo "Token obtained: ${TOKEN:0:20}..."
fi

echo ""
echo -e "${YELLOW}4. Testing Frontend${NC}"
echo -n "Frontend on port 3001: "
FRONTEND_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
echo $FRONTEND_RESP

if [ "$FRONTEND_RESP" != "200" ]; then
    echo -e "${RED}Frontend not responding!${NC}"
    echo "Checking frontend process:"
    ps aux | grep -E "next|npm" | grep -v grep || echo "No Next.js process found"
fi

echo ""
echo -e "${YELLOW}5. Testing Through Nginx${NC}"
echo -n "Homepage through nginx: "
curl -s -o /dev/null -w "%{http_code}\n" http://93.127.194.202/

echo -n "Auth endpoint through nginx: "
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://93.127.194.202/auth/login

echo ""
echo -e "${YELLOW}6. Checking Frontend Build${NC}"
cd /opt/carcollection/car-collection-prototype

if [ -d ".next" ]; then
    echo "✓ Build directory exists"
    echo "Build size: $(du -sh .next | cut -f1)"
else
    echo -e "${RED}✗ No build directory found!${NC}"
fi

echo ""
echo -e "${YELLOW}7. Environment Check${NC}"
echo "Frontend .env.production:"
cat .env.production | grep -v "^#" | grep -v "^$"

echo ""
echo -e "${YELLOW}8. Recent Frontend Logs${NC}"
journalctl -u carcollection-frontend -n 20 --no-pager | tail -10

echo ""
echo -e "${YELLOW}9. Testing API Paths in Built Files${NC}"
echo "Checking for API paths in built frontend:"
grep -r "93.127.194.202" .next 2>/dev/null | wc -l | xargs echo "References to server IP:"
grep -r "localhost:8000" .next 2>/dev/null | wc -l | xargs echo "References to localhost:"

echo ""
echo -e "${YELLOW}10. Manual Frontend Start Test${NC}"
echo "Trying to start frontend manually..."

# Kill any existing process on 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Try to start manually
cd /opt/carcollection/car-collection-prototype
timeout 10s npm start 2>&1 | head -20

echo ""
echo -e "${YELLOW}=== Diagnosis Summary ===${NC}"
echo ""

# Analyze results
if [ "$FRONTEND_RESP" != "200" ]; then
    echo -e "${RED}ISSUE: Frontend is not running on port 3001${NC}"
    echo "Action: Check frontend service logs and restart"
elif [ "$STATUS" != "200" ]; then
    echo -e "${RED}ISSUE: Backend API is not responding${NC}"
    echo "Action: Check backend service and restart"
else
    echo -e "${GREEN}Services appear to be running${NC}"
    echo ""
    echo "If you still see 'Something went wrong!':"
    echo "1. The error is likely in the React app itself"
    echo "2. Check browser console for JavaScript errors"
    echo "3. Try accessing: http://93.127.194.202/dashboard directly"
    echo "4. Or try: http://93.127.194.202/login"
fi

echo ""
echo "Quick fix commands:"
echo "- Restart all: systemctl restart carcollection-backend carcollection-frontend nginx"
echo "- View frontend logs: journalctl -u carcollection-frontend -f"
echo "- View backend logs: journalctl -u carcollection-backend -f"