#!/bin/bash

# API Error Debugging Script
echo "=== Car Collection API Error Debugging ==="
echo "This script will capture and display API errors in real-time"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Starting error monitoring..."
echo "Try to:"
echo "1. Add a new car"
echo "2. Create a new user/invitation"
echo ""
echo "Errors will appear below:"
echo "=========================================="

# Function to monitor backend logs
monitor_backend() {
    echo -e "${YELLOW}=== BACKEND API ERRORS ===${NC}"
    journalctl -u carcollection-backend -f --no-pager | grep -E "ERROR|error|Error|Exception|Failed|failed|Traceback|Internal Server Error|500|403|401|400" --color=always
}

# Function to monitor nginx access logs for API calls
monitor_nginx() {
    echo -e "${YELLOW}=== NGINX API REQUESTS ===${NC}"
    tail -f /var/log/nginx/access.log | grep -E "/api/|/auth/" | awk '{
        status=$9
        if (status >= 400) {
            printf "\033[0;31m[ERROR %s]\033[0m %s %s %s\n", status, $1, $7, $11
        } else {
            printf "\033[0;32m[OK %s]\033[0m %s %s\n", status, $1, $7
        }
    }'
}

# Function to test API endpoints directly
test_endpoints() {
    echo -e "${YELLOW}=== TESTING API ENDPOINTS ===${NC}"
    
    # First, try to login to get a token
    echo "1. Testing login endpoint..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
        -H "Content-Type: application/json" \
        -d '{"username": "Administrator", "password": "Tarzan7Jane"}' 2>&1)
    
    if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
        echo -e "${GREEN}✓ Login successful${NC}"
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
        echo "Token obtained: ${TOKEN:0:20}..."
    else
        echo -e "${RED}✗ Login failed:${NC}"
        echo "$LOGIN_RESPONSE"
        return
    fi
    
    # Test cars endpoint
    echo ""
    echo "2. Testing GET /api/cars..."
    CARS_RESPONSE=$(curl -s -X GET http://localhost:8000/api/cars \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    
    if echo "$CARS_RESPONSE" | grep -q "^\["; then
        echo -e "${GREEN}✓ Cars endpoint working${NC}"
    else
        echo -e "${RED}✗ Cars endpoint failed:${NC}"
        echo "$CARS_RESPONSE"
    fi
    
    # Test creating a car
    echo ""
    echo "3. Testing POST /api/cars (create car)..."
    CREATE_RESPONSE=$(curl -s -X POST http://localhost:8000/api/cars \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "make": "Test",
            "model": "Car",
            "year": 2024,
            "vin": "TEST123",
            "license_plate": "TEST123",
            "mileage": 0,
            "color": "Red",
            "purchase_date": "2024-01-01",
            "notes": "Test car from debug script"
        }' 2>&1)
    
    if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
        echo -e "${GREEN}✓ Car creation working${NC}"
        CAR_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":[0-9]*' | cut -d: -f2)
        
        # Clean up - delete the test car
        curl -s -X DELETE "http://localhost:8000/api/cars/$CAR_ID" \
            -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
    else
        echo -e "${RED}✗ Car creation failed:${NC}"
        echo "$CREATE_RESPONSE"
    fi
    
    # Test invitations endpoint (for creating users)
    echo ""
    echo "4. Testing GET /api/invitations..."
    INVITE_RESPONSE=$(curl -s -X GET http://localhost:8000/api/invitations \
        -H "Authorization: Bearer $TOKEN" 2>&1)
    
    if echo "$INVITE_RESPONSE" | grep -q "^\["; then
        echo -e "${GREEN}✓ Invitations endpoint working${NC}"
    else
        echo -e "${RED}✗ Invitations endpoint failed:${NC}"
        echo "$INVITE_RESPONSE"
    fi
}

# Create a simple menu
echo ""
echo "Select monitoring option:"
echo "1) Monitor Backend Errors Only"
echo "2) Monitor Nginx Requests Only"
echo "3) Test API Endpoints Now"
echo "4) Monitor Everything (Backend + Nginx)"
echo "5) Check Current Error Logs (last 50 lines)"

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        monitor_backend
        ;;
    2)
        monitor_nginx
        ;;
    3)
        test_endpoints
        ;;
    4)
        # Run both in split view
        echo "Starting combined monitoring (Ctrl+C to stop)..."
        echo ""
        
        # Create named pipes
        mkfifo /tmp/backend_pipe /tmp/nginx_pipe 2>/dev/null
        
        # Start monitors in background
        monitor_backend > /tmp/backend_pipe &
        BACKEND_PID=$!
        
        monitor_nginx > /tmp/nginx_pipe &
        NGINX_PID=$!
        
        # Display both
        while true; do
            if read -t 0.1 line < /tmp/backend_pipe; then
                echo "[BACKEND] $line"
            fi
            if read -t 0.1 line < /tmp/nginx_pipe; then
                echo "[NGINX] $line"
            fi
        done
        
        # Cleanup
        kill $BACKEND_PID $NGINX_PID 2>/dev/null
        rm -f /tmp/backend_pipe /tmp/nginx_pipe
        ;;
    5)
        echo -e "${YELLOW}=== RECENT BACKEND ERRORS (last 50 lines) ===${NC}"
        journalctl -u carcollection-backend --no-pager -n 50 | grep -E "ERROR|error|Error|Exception|Failed|failed|Traceback|Internal Server Error" --color=always || echo "No errors found in last 50 lines"
        
        echo ""
        echo -e "${YELLOW}=== RECENT NGINX ERRORS (last 50 lines) ===${NC}"
        tail -50 /var/log/nginx/error.log | grep -v "favicon.ico" || echo "No errors in nginx error log"
        
        echo ""
        echo -e "${YELLOW}=== RECENT FAILED API REQUESTS ===${NC}"
        tail -100 /var/log/nginx/access.log | grep -E "/api/|/auth/" | awk '$9 >= 400 {print}' || echo "No failed API requests found"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac